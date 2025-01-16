import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from "n8n-workflow";
import { Client, ProducerConfig } from "pulsar-client";

export class PulsarPublish implements INodeType {
    description: INodeTypeDescription = {
        displayName: "Pulsar Publisher",
        name: "pulsarPublish",
        icon: "file:pulsar.svg",
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
                        displayName: "Delivery Delay (ms)",
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
        const client = new Client({
            serviceUrl: credentials.serviceUrl as string,
            operationTimeoutSeconds: 30,
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
