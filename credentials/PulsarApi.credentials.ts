import type { IconFile, ICredentialType, INodeProperties, Themed } from 'n8n-workflow';

export class PulsarApi implements ICredentialType {
    name = 'pulsarApi';
    
    displayName = 'Pulsar API';

    documentationUrl = 'https://pulsar.apache.org/';

    icon = {
        light: 'file:pulsar-light.svg',
        dark: 'file:pulsar-dark.svg'
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
        }
    ];
}