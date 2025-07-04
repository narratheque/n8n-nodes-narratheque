import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';
import axios from 'axios';
import { Buffer } from 'buffer';

export class NarrathequeNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Narrathèque',
		name: 'narrathequeNode',
		group: ['transform'],
		icon: 'file:icon.svg',
		documentationUrl: 'https://narratheque.io/docs/n8n',
		version: 1,
		description: 'Noeux qui permet d\'interagir avec la Narrathèque et d\'y ajouter des fichiers dans ses companies',
		defaults: {
			name: 'Narrathèque Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Narratheque Choice',
				name: 'predefinedUrl',
				type: 'options',
				options: [
					{
						name: 'Europe',
						value: 'https://api.narratheque.io',
					},
					{
						name: 'Canada',
						value: 'https://api.narratheque.ca',
					},
				],
				default: 'https://api.narratheque.io',
				displayOptions: {
					show: {
						useCustomUrl: [false],
					},
				},
			},
			{
				displayName: 'Custom Install',
				name: 'useCustomUrl',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Custom URL',
				name: 'customUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your.custom.url',
				displayOptions: {
					show: {
						useCustomUrl: [true],
					},
				},
			},
			{
				displayName: 'Company Token',
        name: 'token',
        type: 'string',
								typeOptions: { password: true },
        default: '',
				description: 'Token from your company in narratheque.io or your custom instance',
        placeholder: 'cxx-xxx-xxx-xxx',
				required: true,
      },
			{
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property containing the file',
      },
			{
				displayName: 'List of URLs',
				name: 'urlList',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add URL',
				},
				default: [],
				placeholder: 'https://example.com/file.jpg',
				description: 'URLs to send if no binary file is provided',
			},
			{
				displayName: 'Text Content Field',
				name: 'textContentField',
				type: 'string',
				default: '',
				description: 'Text to pass to the Narrathèque API. This will be used as the content of the file if no binary file is provided.',
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const useCustomUrl = this.getNodeParameter('useCustomUrl', i) as boolean;
			const urlBase = useCustomUrl
				? (this.getNodeParameter('customUrl', i) as string)
				: (this.getNodeParameter('predefinedUrl', i) as string);

			const token = this.getNodeParameter('token', i) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const urlList = this.getNodeParameter('urlList', i) as string[];
			const textContentField = this.getNodeParameter('textContentField', i) as string;

			const item = items[i];
			const hasBinary = item.binary?.[binaryPropertyName] !== undefined;
			const hasText = textContentField && item.json?.[textContentField];

			// Cas 1 : Fichier binaire présent
			if (hasBinary) {
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

				const form = new FormData();
				form.append('file', Buffer.from(binaryData.data, binaryData.encoding as BufferEncoding), {
					filename: binaryData.fileName || 'file',
					contentType: binaryData.mimeType || 'application/octet-stream',
				});
				form.append('filename', binaryData.fileName || 'file');
				form.append('contentType', binaryData.mimeType || '');

				const headers = {
					...form.getHeaders(),
					Authorization: `Bearer ${token}`,
				};

				const response = await axios.post(`${urlBase}/api/app/documents-jwt`, form, { headers });

				returnData.push({
					json: {
						status: 'uploaded via binary',
						response: response.data,
					},
				});
			}
			// Cas 2 : Champ texte JSON à transformer en .txt
			else if (hasText) {
				const textContent = item.json[textContentField] as string;
				const buffer = Buffer.from(textContent, 'utf-8');

				const form = new FormData();
				form.append('file', buffer, {
					filename: 'document.txt',
					contentType: 'text/plain',
				});
				form.append('filename', 'document.txt');
				form.append('contentType', 'text/plain');

				const headers = {
					...form.getHeaders(),
					Authorization: `Bearer ${token}`,
				};

				const response = await axios.post(`${urlBase}/api/app/documents-jwt`, form, { headers });

				returnData.push({
					json: {
						status: 'uploaded via generated text file',
						response: response.data,
					},
				});
			}
			// Cas 3 : Liste d’URLs
			else if (urlList && urlList.length > 0) {
				const headers = {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				};

				const response = await axios.post(`${urlBase}/api/app/documents-jwt-from-urls`, {
					urls: urlList,
				}, { headers });

				returnData.push({
					json: {
						status: 'uploaded via urls',
						response: response.data,
					},
				});
			}
			// Cas 4 : rien fourni
			else {
				throw new NodeOperationError(this.getNode(), `Item ${i} : aucun fichier, contenu texte, ni URL fourni.`);
			}
		}

		return [returnData];
	}
}
