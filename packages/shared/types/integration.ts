export interface Integration {
	id: string;
	name: string;
	kind: string;
	enabled: boolean;
	status: string;
}

export interface IntegrationsResponse {
	integrations: Integration[];
}
