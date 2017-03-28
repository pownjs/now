# pown-now [![Gitter](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/pownjs/Lobby)

> Network over WebSockets

The Pown NOW tool relays network packets over a WebSocket using several builtin capture types:

* 0 - raw packet frames
* 1 - reconstructed TCP packet frames (incomplete)
* 2 - reconstructed TCP sessions
* 3 - HTTP sessions (default)

Clients connected to the WebSocket will receive messages in the format specified. You can build your own tool to consume the WebSocket feed or use one of the builtin tools such as [HTTPView](https://httpview.secapps.com) by SecApps.

## How To Use

Pown NOW works with both network interfaces and PCAP files. To start capture on a network interface use the following command:

```sh
$ pown now eth0
```

In order to read a PCAP file use the following command:

```
$ pown now path/to/file.pcap
```

Keep in mind that the default capture type is 3 - meaning that packets will be reconstructed into HTTP sessions. You can see the reconstructed sessions using a tool such as [HTTPView](https://httpview.secapps.com) by SecApps. For example:

```
$ pow now -a httpview eth0
```

This command will open the established WebSocket into HTTPView. HTTP traffic captured on interface eth0 will be displayed inside the tool for further investigation.

One particular use case is investigating HTTP traffic from iOS devices which this tool handles very elegantly.

In order to capture the traffic from an iOS device first get the device UDID with the following command:

```sh
$ instruments -s devices
```

Using the Remote Virtual Interface Tool (rvictl) start a remote capture instance by using the following command:

```sh
$ rvictl -s $udid
```

This command will create a new network interface called rvi0 (most likely), which can be captured on with Pown NOW by using the following command:

```
$ pown now -a httpview rvi0
```

HTTP traffic from the iOS device will now be displayed inside HTTPView - excellent for security research among many other things.

## Capture Types

The capture type defines a simple binary protocol that is used to transfer each individual packet or session, in case of HTTP. All messages begin with the transfer type number (indicating the transfer type) followed by the transfer type specific format.

The following transfer types are supported:

**0 - RAW Packet**

```
+-----------------------------------------+
| UINT32BE Transfer Type (set to 0)       |
+-----------------------------------------+
| Payload (packet with frames)            |
+-----------------------------------------+
```

**1 - Reconstructed TCP packet frames (incomplete)**

```
+-----------------------------------------+
| UINT32BE Transfer Type (set to 1)       |
+-----------------------------------------+
| SHORT Direction (0 send, 1 recv, 2 end) |
+-----------------------------------------+
| Payload (packet with frames)            |
+-----------------------------------------+
```

**2 - Reconstructed TCP packet sessions**

```
+-----------------------------------------+
| UINT32BE Transfer Type (set to 2)       |
+-----------------------------------------+
| UINT32BE Data Sent Length               |
+-----------------------------------------+
| Data Sent Payload                       |
+-----------------------------------------+
| Data Received Payload                   |
+-----------------------------------------+
```

**3 - Reconstructed HTTP sessions**

```
+-----------------------------------------+
| UINT32BE Transfer Type (set to 2)       |
+-----------------------------------------+
| UINT32BE Request Length                 |
+-----------------------------------------+
| Request Payload                         |
+-----------------------------------------+
| Response Payload                        |
+-----------------------------------------+
```

## How To Contribute

Pown NOW is still in development although it is 100% functional. However, the following number of features will be good to have.

* [ ] Relay packets from the client to the server - i.e. packet injection
* [ ] Extend with additional capture types for reconstructing known protocols
* [ ] Implement more tools to consume the WebSocket feed
* [ ] Watch PCAP files, seek and continue reading - useful with tcpdump
* [ ] Better support for streaming protocols - i.e. WebSockets, etc

## Quickstart

From the same directory as your project's package.json, install this module with the following command:

```sh
$ npm install pown-now --save
```

Once that's done, you can invoke Pown NOW like this:

```sh
$ POWN_ROOT=. pown now
```

If installed globally or as part of Pown.js distribution invoke like this:

```sh
$ pown now
```
