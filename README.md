![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-pulsar

This is an n8n community node. It lets you use Apache Pulsar in your n8n workflows.

Apache Pulsar is an open-source distributed pub-sub messaging and streaming platform built for cloud-native environments.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  <!-- delete if no auth needed -->  
[Compatibility](#compatibility)  
[Usage](#usage)  <!-- delete if not using this section -->  
[Resources](#resources)  
[Version history](#version-history)  <!-- delete if not using this section -->  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Consume Messages**: Subscribes to a Pulsar topic and triggers a workflow when new messages are received.

## Credentials

You will need the following information to authenticate with Apache Pulsar:
- **Pulsar Service URL**: The URL of your Pulsar service (e.g., `pulsar://localhost:6650`)
- **Authentication Type**: Currently supports:
  - No authentication
  - Token-based authentication
  - OAuth2 authentication

## Compatibility

This node has been tested with n8n version 1.0+ and Apache Pulsar 2.10+.

## Usage

1. Create a new workflow
2. Add a Pulsar Trigger node
3. Configure the connection credentials
4. Specify the topic to subscribe to
5. Configure subscription options (subscription name, subscription type)
6. Deploy the workflow and the node will start consuming messages

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Apache Pulsar documentation](https://pulsar.apache.org/docs/)

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
