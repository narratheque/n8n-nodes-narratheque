import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import FormData from 'form-data';
import axios from 'axios';
import { Buffer } from 'buffer';

export class NarrathequeDataNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Narratheque fichier',
		name: 'narrathequeDataNode',
		group: ['transform'],
		icon: 'file:icon.svg',
		documentationUrl: 'https://narratheque.io/docs/n8n',
		version: 1,
		description: 'Noeux qui permet d\'interagir avec la Narrathèque et d\'y ajouter des fichiers dans ses companies',
		defaults: {
			name: 'Narrathèque Node - Fichier',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'narrathequeCredentialsApi',
				required: true,
			},
		],
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
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property containing the file',
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
			const useCustomUrl = this.getNodeParameter('useCustomUrl', i) as boolean;
			const urlBase = useCustomUrl
				? (this.getNodeParameter('customUrl', i) as string)
				: (this.getNodeParameter('predefinedUrl', i) as string);

			const credentials = await this.getCredentials('narrathequeCredentialsApi');
			const token = credentials.token as string;

			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

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

		return [returnData];
	}
}
