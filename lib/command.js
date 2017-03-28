exports.yargs = {
    command: 'now [options] <iface|file>',
    describe: 'network over websockets',

    builder: (builder) => {
        builder.usage(`${require('./banner')}${this.yargs.command}`)

        builder.option('filter', {
            type: 'string',
            alias: 'f',
            describe: 'PCAP filter to use'
        })

        builder.option('host', {
            type: 'string',
            alias: 'h',
            default: '127.0.0.1',
            describe: 'Bind to host'
        })

        builder.option('port', {
            type: 'number',
            alias: 'p',
            default: 8080,
            describe: 'Bind to port'
        })

        builder.option('type', {
            type: 'number',
            alias: 't',
            default: 3,
            choices: [0, 1, 2, 3],
            describe: 'Bind to host'
        })

        builder.option('monitor', {
            type: 'boolean',
            alias: 'm',
            default: false,
            describe: 'Use monitor mode'
        })

        builder.option('promisc', {
            type: 'boolean',
            alias: 's',
            default: false,
            describe: 'Use promisc mode'
        })

        builder.option('write', {
            type: 'string',
            alias: 'w',
            describe: 'Write to pcap file'
        })

        builder.option('app', {
            type: 'string',
            alias: 'a',
            default: '',
            choices: ['', 'httpview'],
            describe: 'Open app'
        })

        builder.example('https://github.com/pownjs/pown-now', 'tricks, tips and examples')
    },

    handler: (argv) => {
        const chalk = require('chalk')

        console.log(require('./banner'))

        const single = (input) => Array.isArray(input) ? input[0] : input

        const filter = single(argv.filter)
        const type = single(argv.type)
        const host = single(argv.host)
        const port = single(argv.port)
        const monitor = single(argv.monitor)
        const promisc = single(argv.promisc)
        const write = single(argv.write)
        const app = single(argv.app)

        if (type !== 3 && app === 'httpview') {
            console.log(chalk.yellow('!'), chalk.black.bgYellow(`type ${type} typically does not work with app ${app}`))
        }

        const now = require('./index')

        now.on('listening', (server) => {
            console.log(chalk.green('*'), `listening on ${server._server.address().address}:${server._server.address().port}`)

            if (app) {
                const opn = require('opn')

                switch (app) {
                    case 'httpview':
                        opn(`https://httpview.secapps.com/#feedURI=${encodeURIComponent(`ws://${server._server.address().address}:${server._server.address().port}`)}`)

                        break

                    default:
                        console.error(chalk.red('-'), `unrecognized application ${app}`)
                }
            }
        })

        now.on('connection', (client) => {
            console.log(chalk.green('*'), `connected from ${client._socket.remoteAddress}:${client._socket.remotePort}`)
        })

        now.on('error', (error) => {
            console.error(chalk.red('-'), chalk.white.bgRed(error.message || error))
        })

        const options = {
            filter: filter,
            type: type,
            host: host,
            port: port,
            monitor: monitor,
            promisc: promisc,
            write: write
        }

        now.start((argv.iface || argv.file), options, (err) => {
            if (err) {
                console.error(chalk.red('-'), chalk.white.bgRed(err.message || err))

                process.exit(2)
            }
        })
    }
}
