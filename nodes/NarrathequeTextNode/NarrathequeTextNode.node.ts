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

export class NarrathequeTextNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Narratheque Text',
		name: 'narrathequeTextNode',
		group: ['transform'],
		icon: 'file:icon.svg',
		documentationUrl: 'https://narratheque.io/docs/n8n',
		version: 1,
		description: 'Noeux qui permet d\'interagir avec la Narrathèque et d\'y ajouter un texte dans ses companies',
		defaults: {
			name: 'Narrathèque Node - Texte',
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
				displayName: 'Text Content',
				name: 'textContent',
				type: 'string',
				default: '',
				description: 'Text to send to the Narrathèque',
				required: true,
				typeOptions: {
					rows: 5,
				},
			},
			{
				displayName: 'Filename (Optional)',
				name: 'filename',
				type: 'string',
				default: '',
				placeholder: 'example.txt',
				description: 'Custom filename for the uploaded text file (optional). ".txt" will be added if not present.',
			}
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
			try {
				const useCustomUrl = this.getNodeParameter('useCustomUrl', i) as boolean;
				const urlBase = useCustomUrl
					? (this.getNodeParameter('customUrl', i) as string)
					: (this.getNodeParameter('predefinedUrl', i) as string);

				const token = this.getNodeParameter('token', i) as string;
				const textContent = this.getNodeParameter('textContent', i) as string;
				const userFilename = this.getNodeParameter('filename', i, '') as string;

				if (!textContent || typeof textContent !== 'string') {
					throw new NodeOperationError(this.getNode(), `Invalid or missing text content in item ${i + 1}.`);
				}

				let finalFilename = userFilename?.trim();

				const suffix = `-${i + 1}`;

				if (!finalFilename) {
					finalFilename = `import-text-n8n${suffix}.txt`;
				} else {
					if (finalFilename.toLowerCase().endsWith('.txt')) {
						finalFilename = finalFilename.slice(0, -4);
					}
					finalFilename = `${finalFilename}${suffix}.txt`;
				}

				const buffer = Buffer.from(textContent, 'utf-8');

				const form = new FormData();
				form.append('file', buffer, {
					filename: finalFilename,
					contentType: 'text/plain',
				});
				form.append('filename', finalFilename);
				form.append('contentType', 'text/plain');

				const headers = {
					...form.getHeaders(),
					Authorization: `Bearer ${token}`,
				};

				const response = await axios.post(`${urlBase}/api/app/documents-jwt`, form, { headers });

				returnData.push({
					json: {
						status: 'Uploaded via dynamic text content',
						filename: finalFilename,
						response: response.data,
					},
				});
			} catch (error) {
				throw new NodeOperationError(this.getNode(), `Request failed for item ${i + 1}: ${error.message}`);
			}
		}

		return [returnData];
	}
}
