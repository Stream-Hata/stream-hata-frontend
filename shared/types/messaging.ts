import type { PublicKeyBundle, SecureEnvelope } from '../crypto/secure-messaging';

export interface MessagingContact {
	login: string;
	displayName: string;
	avatar: string;
	keyId: string;
	encryptionKey: JsonWebKey;
	signingKey: JsonWebKey;
	isTest: boolean;
	online?: boolean;
	pinned?: boolean;
	archived?: boolean;
	archiveReason?: string;
}

export interface MessageReaction {
	emoji: string;
	count: number;
	mine: boolean;
}

export interface MessagingEnvelope {
	id: number;
	sender: string;
	recipient: string;
	envelope: SecureEnvelope;
	createdAt: string;
	readAt?: string;
	editedAt?: string;
	reactions?: MessageReaction[];
}

export interface RelationshipInfo {
	strength: number;
	mutual: boolean;
	blocked: boolean;
	label: string;
}

export interface GraphNode {
	login: string;
	displayName: string;
	strength: number;
	mutual: boolean;
	blocked: boolean;
	label: string;
}

export interface IncomingMessage {
	id: number;
	sender: string;
	displayName: string;
	avatar: string;
	envelope: SecureEnvelope;
	createdAt: string;
	keyId: string;
	encryptionKey: JsonWebKey;
	signingKey: JsonWebKey;
}

export interface MessagingGraph {
	center: { login: string; displayName: string };
	nodes: GraphNode[];
}

export function contactBundle(contact: MessagingContact): PublicKeyBundle {
	return {
		algorithm: 'ECDH-P256+ECDSA-P256',
		keyId: contact.keyId,
		encryptionKey: contact.encryptionKey,
		signingKey: contact.signingKey,
	};
}

export interface SecurityScanEngine {
	name: string;
	status: string;
	detected: boolean;
	trusted: boolean;
	detail?: string;
}

export interface SecurityScanReport {
	sha256: string;
	size: number;
	fileName: string;
	verdict: string;
	severity: string;
	reason: string;
	rawDetections: number;
	trustedDetections: number;
	engines: SecurityScanEngine[];
	cached: boolean;
	checkedAt: string;
	error?: string;
}

export interface SecurityNotice {
	id: number;
	incidentId: number;
	sender: string;
	recipient: string;
	kind: string;
	verdict: string;
	severity: string;
	fileName: string;
	fileHash: string;
	reason: string;
	report: Record<string, unknown>;
	createdAt: string;
}
