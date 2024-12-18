import { IDataObject, INodeType, INodeTypeDescription, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';
import { Client, Consumer, ConsumerConfig, SubscriptionType } from 'pulsar-client';

export class PulsarTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Pulsar Trigger',
        name: 'pulsarTrigger',
        icon: { light: 'file:pulsar-light.svg', dark: 'file:pulsar-dark.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Consume messages from a Pulsar topic',
        defaults: {
            name: 'Pulsar Trigger',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
            {
                name: 'pulsarApi',
                required: false
            }
        ],
        properties: [
            {
                displayName: 'Subscription Name',
                name: 'subscriptionName',
                type: 'string',
                default: '',
                placeholder: 'my-subscription',
                description: 'The subscription name to use',
            },
            {
                displayName: 'Topic',
                name: 'topic',
                type: 'string',
                default: '',
                placeholder: 'my-topic',
                description: 'The topic to consume messages from',
            },
            {
                displayName: 'JSON Parse Message',
                name: 'jsonParseMessage',
                type: 'boolean',
                default: true,
                description: 'Whether to parse the message as JSON',
            },
            {
                displayName: 'Subscription Type',
                name: 'subscriptionType',
                type: 'options',
                default: 'Exclusive',
                options: [
                    { name: 'Exclusive', value: 'Exclusive' },
                    { name: 'Shared', value: 'Shared' },
                    { name: 'KeyShared', value: 'Key_Shared' },
                    { name: 'Failover', value: 'Failover' },
                ],
            },
            {
                displayName: 'Receiver Queue Size',
                name: 'receiverQueueSize',
                type: 'number',
                default: 1000,
                description: 'The size of the receiver queue',
            },
            {
                displayName: 'Ack Timeout',
                name: 'ackTimeoutMs',
                type: 'number',
                default: 1000,
                description: 'The timeout for acking messages',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                default: {},
                placeholder: 'Add Option',
                options: [
                    {
                        displayName: 'Topics',
                        name: 'topics',
                        type: 'string',
                        default: '',
                        description: 'The array of topics to consume messages from',
                    },
                    {
                        displayName: 'Topic Pattern',
                        name: 'topicPattern',
                        type: 'string',
                        default: '',
                        description: 'The regular expression for topics',
                    },
                    {
                        displayName: 'Subscription Initial Position',
                        name: 'subscriptionInitialPosition',
                        type: 'options',
                        default: 'Earliest',
                        options: [
                            { name: 'Earliest', value: 'Earliest' },
                            { name: 'Latest', value: 'Latest' },
                        ],
                        description: 'Initial position at which to set cursor when subscribing to a topic at first time',
                    },
                    {
                        displayName: 'NAck Redeliver Timeout',
                        name: 'nAckRedeliverTimeoutMs',
                        type: 'number',
                        default: 60000,
                        description: 'Delay to wait before redelivering messages that failed to be processed',
                    },
                    {
                        displayName: 'Receiver Queue Size Across Partitions',
                        name: 'receiverQueueSizeAcrossPartitions',
                        type: 'number',
                        default: 50000,
                        description: 'Set the max total receiver queue size across partitions. This setting is used to reduce the receiver queue size for individual partitions if the total exceeds this value.',
                    },
                    {
                        displayName: 'Consumer Name',
                        name: 'consumerName',
                        type: 'string',
                        default: '',
                        description: 'The name of consumer. Currently(v2.4.1), failover mode use consumer name in ordering.',
                    },
                    {
                        displayName: 'Properties',
                        name: 'properties',
                        type: 'collection',
                        default: {},
                        description: 'The metadata of consumer',
                    },
                    {
                        displayName: 'Read Compacted',
                        name: 'readCompacted',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to read messages from a compacted topic rather than reading a full message backlog. Only available for persistent topics with single active consumer. Not supported for shared subscriptions or non-persistent topics',
                    }
                ],
            },
        ],
    };
    
    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {

        const subscription = this.getNodeParameter('subscriptionName') as string;
        const topic = this.getNodeParameter('topic') as string;
        const subscriptionType = this.getNodeParameter('subscriptionType') as SubscriptionType;
        const receiverQueueSize = this.getNodeParameter('receiverQueueSize') as number;
        const ackTimeoutMs = this.getNodeParameter('ackTimeoutMs') as number;
        const options = this.getNodeParameter('options') as IDataObject;

        const credentials = await this.getCredentials('pulsarApi');

        const config: ConsumerConfig = {
            subscription: subscription,
            topic: topic,
            subscriptionType: subscriptionType,
            receiverQueueSize: receiverQueueSize,
            ackTimeoutMs: ackTimeoutMs,
            ...options
        };

        const client = new Client({ serviceUrl: credentials.serviceUrl as string });
        let consumer: Consumer;
        const startConsumer = async () => {
            if (consumer) {
                return;
            }
            consumer = await client.subscribe({...config,
                listener: async (msg, msgConsumer ) => {
                    
                    let data: IDataObject = {};
                    let value = msg.getData().toString();
                    if (this.getNodeParameter('jsonParseMessage') as boolean) {
                        try {
                            value = JSON.parse(value);
                        } catch (error) {}
                    }
                    data.message = value;
                    data.headers = msg.getProperties();``
                    data.topic = msg.getTopicName();
                    data.messageId = msg.getMessageId();
                    data.eventTimestamp = new Date(msg.getEventTimestamp());
                    data.redeliveryCount = msg.getRedeliveryCount();
                    data.publishTimestamp = new Date(msg.getPublishTimestamp());
                    data.redeliveryCount = msg.getRedeliveryCount();
                    await msgConsumer.acknowledge(msg);
                    this.emit([this.helpers.returnJsonArray(data)]);
                }
            });
		};

        await startConsumer();

        // The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
            await consumer.close();
            await client.close();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
			await startConsumer();
		}

        return {
			closeFunction,
			manualTriggerFunction,
		};

    }
}