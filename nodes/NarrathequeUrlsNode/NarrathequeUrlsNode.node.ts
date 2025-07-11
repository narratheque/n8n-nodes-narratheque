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
		description: 'Envoie des URLs à la Narrathèque depuis un champ d\'entrée',
		defaults: {
			name: 'Narrathèque Node - URL',
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
				displayName: 'Nom du champ contenant l’URL',
				name: 'inputFieldName',
				type: 'string',
				default: 'image_url',
				description: 'Nom du champ dans chaque item contenant l’URL à envoyer',
			},
			{
				displayName: 'Predefined URL',
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
			},
			{
				displayName: 'Use Custom URL',
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
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const credentials = await this.getCredentials('narrathequeCredentialsApi');
		const token = credentials.token as string;

		const inputFieldName = this.getNodeParameter('inputFieldName', 0) as string;

		const useCustomUrl = this.getNodeParameter('useCustomUrl', 0) as boolean;
		const urlBase = useCustomUrl
			? (this.getNodeParameter('customUrl', 0) as string)
			: (this.getNodeParameter('predefinedUrl', 0) as string);

		const urls = items
			.map(item => item.json?.[inputFieldName])
			.filter((u): u is string => typeof u === 'string');

		if (urls.length === 0) {
			throw new Error(`Aucune URL trouvée dans le champ "${inputFieldName}".`);
		}

		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		};

		const response = await axios.post(`${urlBase}/api/app/documents-jwt-from-urls`, {
			urls,
		}, { headers });

		return [[{
			json: {
				status: 'uploaded via urls',
				sentUrls: urls,
				response: response.data,
			},
		}]];
	}
}
