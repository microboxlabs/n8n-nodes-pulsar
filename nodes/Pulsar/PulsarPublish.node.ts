import {
    IconFile,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    Themed,
} from "n8n-workflow";
import { Client, ProducerConfig } from "pulsar-client";


export class PulsarPublish implements INodeType {

    // icon = {
    //     light: 'file:pulsar-light.svg',
    //     dark: 'file:pulsar-dark.svg'
    // } as Themed<IconFile>;

    description: INodeTypeDescription = {
        displayName: "Pulsar Publisher",
        
        name: "pulsarPublish",
        
        icon:  {
            light: 'file:../../assets/pulsar-light.svg',
            dark: 'file:../../assets/pulsar-dark.svg'
        } as Themed<IconFile>,

        group: ["output"],

        version: 1,
        
        description: "Publish messages to Apache Pulsar",
        
        defaults: {
            name: "Pulsar Publisher",
        },
        
        inputs: ["main"],
        outputs: ["main"],
        credentials: [
            {
                name: "pulsarApi",
                required: true,
            },
            // Add OIDC fields
            {
                name: "issuerUrl",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            },
            {
                name: "clientId",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            },
            {
                name: "clientSecret",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            },
            {
                name: "audience",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            },
            {
                name: "scope",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            },
            {
                name: "privateKey",
                required: false,
                displayOptions: { show: { authentication: ['oidc'] } }
            }
        ],
        properties: [
            {
                displayName: "Topic",
                name: "topic",
                type: "string",
                default: "",
                required: true,
                description: "Name of the topic to publish to",
            },
            {
                displayName: "Producer Name",
                name: "producerName",
                type: "string",
                default: "",
                description: "Name of the Producer Name to publish to",
            },
            {
                displayName: "Message Format",
                name: "messageFormat",
                type: "options",
                options: [
                    {
                        name: "Raw",
                        value: "raw",
                        description: "Send message as raw string/buffer",
                    },
                    {
                        name: "JSON",
                        value: "json",
                        description: "Send message as JSON object",
                    },
                ],
                default: "raw",
                description: "The format of the message to be sent",
            },
            {
                displayName: "Message",
                name: "message",
                type: "string",
                default: "",
                required: true,
                description: "Message to publish (string or JSON)",
            },
            {
                displayName: "Options",
                name: "options",
                type: "collection",
                placeholder: "Add Option",
                default: {},
                options: [
                    {
                        displayName: "Message Properties",
                        name: "properties",
                        type: "fixedCollection",
                        typeOptions: {
                            multipleValues: true,
                        },
                        placeholder: "Add Property",
                        default: {},
                        options: [
                            {
                                name: "property",
                                displayName: "Property",
                                values: [
                                    {
                                        displayName: "Key",
                                        name: "key",
                                        type: "string",
                                        default: "",
                                        required: true,
                                    },
                                    {
                                        displayName: "Value",
                                        name: "value",
                                        type: "string",
                                        default: "",
                                        required: true,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        displayName: "Partition Key",
                        name: "partitionKey",
                        type: "string",
                        default: "",
                        description:
                            "Key to decide the partition to send the message to",
                    },
                    {
                        displayName: "Ordering Key",
                        name: "orderingKey",
                        type: "string",
                        default: "",
                        description: "Key to maintain message ordering",
                    },
                    {
                        displayName: 'Delivery Delay (Ms)',
                        name: "deliveryTimestamp",
                        type: "number",
                        default: 0,
                        description:
                            "Delay message delivery by specified milliseconds",
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials("pulsarApi");

        // OIDC authentication support
        let authentication;
        if (
            credentials.issuerUrl &&
            credentials.clientId &&
            credentials.clientSecret
        ) {
            // @ts-ignore
            const Pulsar = require('pulsar-client');
            const params: Record<string, string> = {
                issuer_url: credentials.issuerUrl as string,
                client_id: credentials.clientId as string,
                client_secret: credentials.clientSecret as string,
            };
            if (credentials.privateKey) {
                params.private_key = credentials.privateKey as string;
                delete params.client_secret;
            }
            if (credentials.audience) {
                params.audience = credentials.audience as string;
            }
            if (credentials.scope) {
                params.scope = credentials.scope as string;
            }
            authentication = new Pulsar.AuthenticationOauth2(params);
        }

        const client = new Client({
            serviceUrl: credentials.serviceUrl as string,
            operationTimeoutSeconds: 30,
            ...(authentication ? { authentication } : {}),
        });

        const topic = this.getNodeParameter("topic", 0) as string;  
        let producerName = this.getNodeParameter("producerName", 0) as string;

        if (producerName !== "") {
            producerName = producerName + "-" + Math.random().toString(36).substring(2, 7);
        }

        const producerConfig: ProducerConfig = {
            topic,
            producerName,
        };

        const producer = await client.createProducer(producerConfig);

        try {
            for (let i = 0; i < items.length; i++) {
                const messageFormat = this.getNodeParameter(
                    "messageFormat",
                    i,
                ) as string;
                const message = this.getNodeParameter("message", i) as string;
                const options = this.getNodeParameter("options", i, {}) as {
                    properties?: {
                        property: Array<{ key: string; value: string }>;
                    };
                    partitionKey?: string;
                    orderingKey?: string;
                    deliveryTimestamp?: number;
                };

                let messageData: Buffer;
                if (messageFormat === "json") {
                    try {
                        const jsonMessage = JSON.parse(message);
                        messageData = Buffer.from(JSON.stringify(jsonMessage));
                    } catch (error) {
                        throw new NodeOperationError(
                            this.getNode(),
                            "Invalid JSON message",
                        );
                    }
                } else {
                    messageData = Buffer.from(message);
                }

                const properties: Record<string, string> = {};
                if (options.properties?.property) {
                    for (const prop of options.properties.property) {
                        properties[prop.key] = prop.value;
                    }
                }

                await producer.send({
                    data: messageData,
                    properties,
                    partitionKey: options.partitionKey,
                    orderingKey: options.orderingKey,
                    deliverAt: options.deliveryTimestamp
                        ? Date.now() + options.deliveryTimestamp
                        : undefined,
                });

                returnData.push({ json: { success: true } });
            }
        } finally {
            await producer.close();
            await client.close();
        }

        return [returnData];
    }
}
