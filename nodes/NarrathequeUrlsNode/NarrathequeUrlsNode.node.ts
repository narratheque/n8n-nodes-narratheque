import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import axios from 'axios';

export class NarrathequeUrlsNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Narratheque URLs',
		name: 'narrathequeUrlsNode',
		group: ['transform'],
		icon: 'file:icon.svg',
		documentationUrl: 'https://narratheque.io/docs/n8n',
		version: 1,
		description: 'Noeux qui permet d\'interagir avec la Narrathèque et d\'y ajouter des urls dans ses companies',
		defaults: {
			name: 'Narrathèque Node - URL',
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

			const token = this.getNodeParameter('token', i) as string;
			const urlList = this.getNodeParameter('urlList', i) as string[];

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

		return [returnData];
	}
}
