const fs = require('fs')
const ws = require('ws')
const pcap = require('ws-pcap2')
const EventEmitter = require('events')

// TODO: server support should be provied by a general-purpose pown module

class Now extends EventEmitter {
    constructor(options) {
        super()

        this.options(options)

        this.started = false
    }

    options(options) {
        options = options || {}

        this.filter = options.filter || this.filter || ''
        this.type = options.type || this.type || 3
        this.host = options.host || this.host || '127.0.0.1'
        this.port = options.port || this.port || 8080
        this.monitor = options.monitor || this.monitor || false
        this.promisc = options.promisc || this.promisc || true
        this.write = options.write || this.write || null
    }

    sendClientMessage(message) {
        if (this.messageQueue.length < this.messageQueueSize) {
            this.messageQueue.push(message)
        }

        this.server.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
                client.send(message)
            }
        })
    }

    onSessionHandler3(session) {
        const httpParser = process.binding('http_parser')
        const HTTPParser = httpParser.HTTPParser
        const methods = httpParser.methods

        const kOnHeadersComplete = HTTPParser.kOnHeadersComplete | 0
        const kOnBody = HTTPParser.kOnBody | 0
        const kOnMessageComplete = HTTPParser.kOnMessageComplete | 0
        
        session.req = new HTTPParser(HTTPParser.REQUEST)
        session.res = new HTTPParser(HTTPParser.RESPONSE)

        session.req[kOnHeadersComplete] = (versionMajor, versionMinor, headers, method, url, statusCode, statusMessage, upgrade, shouldKeepAlive) => {
            if (methods[method] === 'CONNECT') {
                // NOTE: CONNECT may indicate encrypted traffic

                session.req[kOnHeadersComplete] = null
                session.req[kOnBody] = null
                session.req[kOnMessageComplete] = null
                session.res[kOnHeadersComplete] = null
                session.res[kOnBody] = null
                session.res[kOnMessageComplete] = null

                return
            }

            let head = `${methods[method]} ${url} HTTP/${versionMinor}.${versionMinor}\r\n`

            for (let i = 0; i < headers.length; i += 2) {
                head += `${headers[i]}: ${headers[i + 1]}\r\n`
            }

            head += '\r\n'

            session.req.buf = new Buffer(head)
        }

        session.req[kOnBody] = (b, start, len) => {
            session.req.buf = Buffer.concat([session.req.buf, b.slice(start, start + len)])
        }

        session.req[kOnMessageComplete] = () => {
        }

        session.res[kOnHeadersComplete] = (versionMajor, versionMinor, headers, method, url, statusCode, statusMessage, upgrade, shouldKeepAlive) => {
            let head = `HTTP/${versionMinor}.${versionMinor} ${statusCode} ${statusMessage}\r\n`

            for (let i = 0; i < headers.length; i += 2) {
                head += `${headers[i]}: ${headers[i + 1]}\r\n`
            }

            head += '\r\n'

            session.res.buf = new Buffer(head)
        }

        session.res[kOnBody] = (b, start, len) => {
            session.res.buf = Buffer.concat([session.res.buf, b.slice(start, start + len)])
        }

        session.res[kOnMessageComplete] = () => {
            if (session.req.buf && session.res.buf) {
                const headerBuf = Buffer.alloc(4 + 4)

                headerBuf.writeUInt32BE(3, 0)
                headerBuf.writeUInt32BE(session.req.buf.byteLength, 4)

                const message = Buffer.concat([headerBuf, session.req.buf, session.res.buf])

                this.sendClientMessage(message)
            }
        }

        session.on('data send', (session, data) => {
            session.req.execute(data)
        })

        session.on('data recv', (session, data) => {
            session.res.execute(data)
        })

        session.on('end', (session) => {
            delete session.req
            delete session.res
        })
    }

    onSessionHandler2(session) {
        session.dataSend = Buffer.alloc(0)
        session.dataRecv = Buffer.alloc(0)

        session.on('data send', (session, data) => {
            session.dataSend = Buffer.concat(session.dataSend, data)
        })

        session.on('data recv', (session, data) => {
            session.dataRecv = Buffer.concat(session.dataRecv, data)
        })

        session.on('end', (session) => {
            const headerBuf = Buffer.alloc(4 + 4)

            headerBuf.writeUInt32BE(2, 0)
            headerBuf.writeUInt32BE(session.dataSend.byteLength, 4)
    
            const message = Buffer.concat([headerBuf, this.dataSend, this.dataRecv])

            this.sendClientMessage(message)
        })
    }

    onSessionHandler1(session) {
        session.dataSend = Buffer.alloc(0)
        session.dataRecv = Buffer.alloc(0)

        session.on('data send', (session, data) => {
            const headerBuf = Buffer.alloc(4 + 1)

            headerBuf.writeUInt32BE(1, 0)
            headerBuf.writeInt8(0, 4)
    
            const message = Buffer.concat([headerBuf, data])

            this.sendClientMessage(message)
        })

        session.on('data recv', (session, data) => {
            const headerBuf = Buffer.alloc(4 + 1)

            headerBuf.writeUInt32BE(1, 0)
            headerBuf.writeInt8(1, 4)
    
            const message = Buffer.concat([headerBuf, data])

            this.sendClientMessage(message)
        })

        session.on('end', (session) => {
            const headerBuf = Buffer.alloc(4 + 1)

            headerBuf.writeUInt32BE(1, 0)
            headerBuf.writeInt8(2, 4)
    
            const message = headerBuf

            this.sendClientMessage(message)
        })
    }

    onPacketHandler3(packet) {
        let decodedPacket

        try {
            decodedPacket = pcap.decode.packet(packet)
        } catch(e) {
            this.emit('error', e)

            return
        }

        this.tracker.track_packet(decodedPacket)
    }

    onPacketHandler2(packet) {
        let decodedPacket

        try {
            decodedPacket = pcap.decode.packet(packet)
        } catch(e) {
            this.emit('error', e)

            return
        }

        this.tracker.track_packet(decodedPacket)
    }

    onPacketHandler1(packet) {
        let decodedPacket

        try {
            decodedPacket = pcap.decode.packet(packet)
        } catch(e) {
            this.emit('error', e)

            return
        }

        this.tracker.track_packet(decodedPacket)
    }

    onPacketHandler0(packet) {
        const headerBuf = Buffer.alloc(4)

        headerBuf.writeUInt32BE(0, 0)

        const message = Buffer.concat([headerBuf, packet])

        this.sendClientMessage(message)
    }

    onListeningHandler() {
        switch (this.type) {
            case 0:
                this.session.on('packet', this.onPacketHandler0.bind(this))

                break

            case 1:
                this.session.on('packet', this.onPacketHandler1.bind(this))

                this.tracker = new pcap.TCPTracker()

                this.tracker.on('session', this.onSessionHandler1.bind(this))
    
                break
            
            case 2:
                this.session.on('packet', this.onPacketHandler2.bind(this))

                this.tracker = new pcap.TCPTracker()

                this.tracker.on('session', this.onSessionHandler2.bind(this))

                break
                
            case 3:
                this.session.on('packet', this.onPacketHandler3.bind(this))

                this.tracker = new pcap.TCPTracker()

                this.tracker.on('session', this.onSessionHandler3.bind(this))

                break

            default:
                throw new Error(`unsupported type ${this.type}`)
        }
    }

    onConnectionHandler(client) {
        this.messageQueue.forEach((message) => {
            client.send(message)
        })
    }

    start(ifaceORfile, options, done) {
        if (typeof(options) === 'function') {
            done = options
            options = {}
        }

        if (!done) {
            done = (err) => {
                if (err) {
                    throw err
                }
            }
        }

        if (this.started) {
            done(new Error('already started'))

            return
        }

        this.options(options)

        this.started = true

        const conf = {
            filter: this.filter,
            isMonitor: this.monitor,
            isPromisc: this.promisc
        }

        // Although this is a hackish way to check if we are dealing with a
        // network interface or a file, unfortunately the os.networkInterfaces
        // node api will not recognize some software network interfaces such as
        // for example those created by the rvictl on Mac OS X.

        if ((_ => { try { return !fs.statSync(argv.file).isDirectory() } catch (e) { return false } })()) {
            try {
                this.session = new pcap.OfflineSession(ifaceORfile, conf)

                this.messageQueueSize = Infinity
                this.messageQueue = []
            } catch (e) {
                done(e)

                return
            }
        } else {
            if (this.write) {
                conf.outfile = this.write
            }

            try {
                this.session = new pcap.Session(ifaceORfile, conf)

                this.messageQueueSize = 0
                this.messageQueue = []
            } catch (e) {
                done(e)

                return
            }
        }

        this.server = new ws.Server({host: this.host, port: this.port})

        this.server.on('listening', this.emit.bind(this, 'listening', this.server))
        this.server.on('connection', this.emit.bind(this, 'connection'))
        this.server.on('error', this.emit.bind(this, 'error'))
        this.server.on('headers', this.emit.bind(this, 'headers'))

        this.server.on('listening', this.onListeningHandler.bind(this))
        this.server.on('connection', this.onConnectionHandler.bind(this))
    }

    stop(done) {
        if (!done) {
            done = (err) => {
                if (err) {
                    throw err
                }
            }
        }

        if (!this.started) {
            done(new Error('not started'))

            return
        }

        this.server.close((err) => {
            if (err) {
                done(err)

                return
            }

            try {
                this.session.close()
            } catch (e) {
                console.error(e) // too late to go back
            }

            this.started = false

            done(null)
        })
    }
}

module.exports = Now
