import * as dgram from 'dgram';
import * as net from 'net';
import * as _ from 'underscore';
import {EventEmitter} from 'events';

// region interfaces

/**
 * Enum listing the protocol to use for the holepunch
 */
export enum RendezvousProtocol {UDP = 0, TCP}
export enum MessageType {DATA = 0, HANDSHAKE}

/**
 * @member port {number}: (optional) specifies the port to listen onto
 * @member host {string}: (optional) specifies the hosts to filter when listening
 * @member protocol {UDP | TCP}: (optional) specifies the protocol to use for the handshake
 */
export interface RendezvousOptions
{
    port?: number;
    host?: string;
    protocol?: RendezvousProtocol
}

/**
 * Interface representing a single peer requesting an handshake
 */
export interface Peer
{
    id: string;
    host: string;
    port: number;
    remote: string;
}

export interface Message
{
    id: string;
    host: string;
    port: number;
    type: MessageType;
}

// endregion

/**
 * @author Marco Moschettini
 * @version 0.0.1
 * @implements EventEmitter
 * @class
 */
export class Rendezvous extends EventEmitter
{
    private _port: number;
    private _host: string;
    private _socket: dgram.Socket | net.Socket;
    private _peers: Array<Peer>;

    constructor(options?: RendezvousOptions)
    {
        super();
        this._port = options && options.port || 4321;
        this._host = options && options.host || null;
        this._peers = [];

        if(options && options.protocol === RendezvousProtocol.TCP)
            this.emit('error', new Error('Not yet implemented'));
        else
        {
            this._socket = dgram.createSocket('udp4');
            this._socket.on('error', (error) =>
            {
                (this._socket as dgram.Socket).close();
                this.emit('error', error)
            });
            this._socket.on('message', (message, sender) => this._on_message(message, sender));
        }
    }

    /**
     * Method that makes the server listening on the provided host and port.
     * @returns Promise <any>: resolved when server has bound to the port
     */
    public listen(): Promise<any>
    {
        return new Promise((resolve) =>
        {
            this._socket.on('listening', () =>
            {
                console.log(`Server listening ${this._socket.address().address}:${this._socket.address().port}`);
                resolve();
            });

            (this._socket as dgram.Socket).bind(this._port, this._host);
        });
    }

    private _on_message(message: string | Buffer, sender: dgram.AddressInfo)
    {
        try
        {
            let peer: Peer = JSON.parse(message as string);

            if(peer.id)
            {
                peer.host = sender.address;
                peer.port = sender.port;

                this._peers[peer.id] = peer;
            }
            else
                return this.emit('error', 'No peer id provided in message');

            if(peer.remote)
            {
                if(this._peers[peer.remote])
                {
                    let response: Message = _.pick(this._peers[peer.remote], 'id', 'host', 'port');
                    response.type = MessageType.HANDSHAKE;
                    let message = JSON.stringify(response);

                    (this._socket as dgram.Socket).send(message, 0, message.length, sender.port, sender.address);
                }
                else
                    console.error('Peer not yet registered');
            }
        }
        catch(error)
        {
            this.emit('error', error);
        }
    }
}
