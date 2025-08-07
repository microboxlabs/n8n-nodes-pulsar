import { IDataObject, INodeType, INodeTypeDescription, ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';
import Pulsar, { Client, Consumer, ConsumerConfig, SubscriptionType } from 'pulsar-client';

export class PulsarTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Pulsar Trigger',
        name: 'pulsarTrigger',
        icon: {
            light: 'file:../../assets/pulsar-light.svg',
            dark: 'file:../../assets/pulsar-dark.svg'
        },
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

        const config: ConsumerConfig = {
            subscription: subscription,
            topic: topic,
            subscriptionType: subscriptionType,
            receiverQueueSize: receiverQueueSize,
            ackTimeoutMs: ackTimeoutMs,
            ...options
        };


        const credentials = await this.getCredentials('pulsarApi');

        // Authentication support
        let authentication;

        console.log('[PulsarTrigger] Authentication type:', credentials.authentication);
        console.log('[PulsarTrigger] Service URL:', credentials.serviceUrl);
        console.log('[PulsarTrigger] TLS Allow Insecure Connection:', credentials.tlsAllowInsecureConnection);

        if (credentials.authentication === 'oauth2' &&
            credentials.issuerUrl &&
            credentials.clientId &&
            credentials.clientSecret
        ) {
            console.log('[PulsarTrigger] Setting up OAuth2/OIDC authentication');
            console.log('[PulsarTrigger] Issuer URL:', credentials.issuerUrl);
            console.log('[PulsarTrigger] Client ID:', credentials.clientId);
            console.log('[PulsarTrigger] Has Client Secret:', !!credentials.clientSecret);
            console.log('[PulsarTrigger] Has Private Key:', !!credentials.privateKey);
            console.log('[PulsarTrigger] Audience:', credentials.audience || 'not set');
            console.log('[PulsarTrigger] Scope:', credentials.scope || 'not set');

            // OIDC/OAuth2 Client Credentials Flow
            const params: { type: string; issuer_url: string; client_id?: string | undefined; client_secret?: string | undefined; private_key?: string | undefined; audience?: string | undefined; scope?: string | undefined; } = {
                type: 'client_credentials',
                issuer_url: credentials.issuerUrl as string,
                client_id: credentials.clientId as string,
                client_secret: credentials.clientSecret as string,
            };
            if (credentials.privateKey) {
                console.log('[PulsarTrigger] Using private key authentication instead of client secret');
                params.private_key = credentials.privateKey as string;
                delete params.client_secret;
            }
            if (credentials.audience) {
                params.audience = credentials.audience as string;
            }
            if (credentials.scope) {
                params.scope = credentials.scope as string;
            }

            try {
                console.log('[PulsarTrigger] Creating Pulsar OAuth2 authentication object');
                authentication = new Pulsar.AuthenticationOauth2(params);
                console.log('[PulsarTrigger] OAuth2 authentication object created successfully');
            } catch (error) {
                console.error('[PulsarTrigger] Error creating OAuth2 authentication:', error);
                throw error;
            }
        } else if (credentials.authentication === 'token' && credentials.token) {
            console.log('[PulsarTrigger] Setting up Token authentication');
            // Token authentication
            try {
                authentication = new Pulsar.AuthenticationToken({
                    token: credentials.token as string
                });
                console.log('[PulsarTrigger] Token authentication object created successfully');
            } catch (error) {
                console.error('[PulsarTrigger] Error creating Token authentication:', error);
                throw error;
            }
        } else if (credentials.authentication === 'jwt' && credentials.jwtToken) {
            console.log('[PulsarTrigger] Setting up JWT authentication');
            // JWT authentication
            try {
                authentication = new Pulsar.AuthenticationToken({
                    token: credentials.jwtToken as string
                });
                console.log('[PulsarTrigger] JWT authentication object created successfully');
            } catch (error) {
                console.error('[PulsarTrigger] Error creating JWT authentication:', error);
                throw error;
            }
        } else {
            console.log('[PulsarTrigger] No authentication configured or missing required fields');
            if (credentials.authentication === 'oauth2') {
                console.log('[PulsarTrigger] OAuth2 selected but missing fields:');
                console.log('  - issuerUrl:', !!credentials.issuerUrl);
                console.log('  - clientId:', !!credentials.clientId);
                console.log('  - clientSecret:', !!credentials.clientSecret);
            }
        }

        const client = new Client({
            serviceUrl: credentials.serviceUrl as string,
            ...(authentication ? { authentication: authentication } : {}),
            ...(credentials.tlsAllowInsecureConnection ? { tlsAllowInsecureConnection: credentials.tlsAllowInsecureConnection as boolean } : {}),
        });

        console.log('[PulsarTrigger] Pulsar client created with authentication:', !!authentication);
        console.log('[PulsarTrigger] TLS Allow Insecure Connection:', !!credentials.tlsAllowInsecureConnection);

        let consumer: Consumer;
        const startConsumer = async () => {
            if (consumer) {
                console.log('[PulsarTrigger] Consumer already exists, skipping creation');
                return;
            }

            console.log('[PulsarTrigger] Creating consumer with config:', {
                subscription: config.subscription,
                topic: config.topic,
                subscriptionType: config.subscriptionType,
                receiverQueueSize: config.receiverQueueSize,
                ackTimeoutMs: config.ackTimeoutMs
            });

            try {
                consumer = await client.subscribe({...config,
                    listener: async (msg: any, msgConsumer: any) => {
                        console.log('[PulsarTrigger] Received message from topic:', msg.getTopicName());
                        console.log('[PulsarTrigger] Message ID:', msg.getMessageId());

                        let data: IDataObject = {};
                        let value = msg.getData().toString();
                        if (this.getNodeParameter('jsonParseMessage') as boolean) {
                            try {
                                value = JSON.parse(value);
                                console.log('[PulsarTrigger] Message parsed as JSON successfully');
                            } catch (error) {
                                console.log('[PulsarTrigger] Failed to parse message as JSON, using raw string');
                            }
                        }
                        data.message = value;
                        data.headers = msg.getProperties();
                        data.topic = msg.getTopicName();
                        data.messageId = msg.getMessageId();
                        data.eventTimestamp = new Date(msg.getEventTimestamp());
                        data.publishTimestamp = new Date(msg.getPublishTimestamp());
                        data.redeliveryCount = msg.getRedeliveryCount();

                        try {
                            await msgConsumer.acknowledge(msg);
                            console.log('[PulsarTrigger] Message acknowledged successfully');
                        } catch (error) {
                            console.error('[PulsarTrigger] Error acknowledging message:', error);
                        }

                        this.emit([this.helpers.returnJsonArray(data)]);
                        console.log('[PulsarTrigger] Message emitted to n8n workflow');
                    }
                });
                console.log('[PulsarTrigger] Consumer created and subscribed successfully');
            } catch (error) {
                console.error('[PulsarTrigger] Error creating consumer:', error);
                throw error;
            }
		};

        await startConsumer();

        // The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
            console.log('[PulsarTrigger] Closing consumer and client...');
            try {
                if (consumer) {
                    await consumer.close();
                    console.log('[PulsarTrigger] Consumer closed successfully');
                }
                await client.close();
                console.log('[PulsarTrigger] Client closed successfully');
            } catch (error) {
                console.error('[PulsarTrigger] Error during cleanup:', error);
            }
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
            console.log('[PulsarTrigger] Manual trigger function called');
			await startConsumer();
		}

        return {
			closeFunction,
			manualTriggerFunction,
		};

    }
}
