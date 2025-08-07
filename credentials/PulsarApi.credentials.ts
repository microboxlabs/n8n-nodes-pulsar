import type { IconFile, ICredentialType, INodeProperties, Themed } from 'n8n-workflow';

export class PulsarApi implements ICredentialType {
    name = 'pulsarApi';

    displayName = 'Pulsar API';

    documentationUrl = 'https://pulsar.apache.org/';

    icon = {
        light: 'file:../../assets/pulsar-light.svg',
        dark: 'file:../../assets/pulsar-dark.svg'
    } as Themed<IconFile>;

    properties: INodeProperties[] = [
        {
            displayName: 'Service URL',
            name: 'serviceUrl',
            type: 'string',
            default: 'pulsar://localhost:6650',
            required: true,
            placeholder: 'pulsar://localhost:6650'
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'options',
            options: [
                { name: 'None', value: 'none' },
                { name: 'Token', value: 'token' },
                { name: 'JWT', value: 'jwt' },
                { name: 'TLS', value: 'tls' },
                { name: 'Basic', value: 'basic' },
                { name: 'OAuth2', value: 'oauth2' },
                { name: 'Kerberos', value: 'kerberos' },
                { name: 'Athenz', value: 'athenz' },
            ],
            default: 'none',
        },
        // Token Authentication fields
        {
            displayName: 'Token',
            name: 'token',
            type: 'string',
            typeOptions: {
                password: true
            },
            displayOptions: {
                show: {
                    authentication: ['token']
                }
            },
            default: '',
            placeholder: 'your-token',
            description: 'Authentication token'
        },
        // JWT Authentication fields
        {
            displayName: 'JWT Token',
            name: 'jwtToken',
            type: 'string',
            typeOptions: {
                password: true
            },
            displayOptions: {
                show: {
                    authentication: ['jwt']
                }
            },
            default: '',
            placeholder: 'your-jwt-token',
            description: 'JWT token for authentication'
        },
        // OAuth2/OIDC Client Credentials Flow fields
        {
            displayName: 'Issuer URL',
            name: 'issuerUrl',
            type: 'string',
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: 'https://your-oidc-provider.com',
            description: 'The OIDC issuer URL for token endpoint discovery'
        },
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: 'your-client-id',
            description: 'OAuth2 Client ID for client credentials flow'
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true
            },
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: 'your-client-secret',
            description: 'OAuth2 Client Secret for client credentials flow'
        },
        {
            displayName: 'Audience',
            name: 'audience',
            type: 'string',
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: 'your-audience',
            description: 'OAuth2 Audience parameter (optional)',
            required: false
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'string',
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: 'scope1 scope2',
            description: 'OAuth2 Scopes separated by spaces (optional)',
            required: false
        },
        {
            displayName: 'Private Key',
            name: 'privateKey',
            type: 'string',
            typeOptions: {
                password: true
            },
            displayOptions: {
                show: {
                    authentication: ['oauth2']
                }
            },
            default: '',
            placeholder: '-----BEGIN PRIVATE KEY-----...',
            description: 'Private key for JWT-based authentication (alternative to client secret)',
            required: false
        },
        // TLS Configuration
        {
            displayName: 'Allow Insecure TLS Connection',
            name: 'tlsAllowInsecureConnection',
            type: 'boolean',
            default: false,
            description: 'Whether to allow insecure TLS connections (skip certificate verification). Use with caution in production environments.'
        }
    ];
}
