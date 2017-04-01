import * as dgram from 'dgram';
import {EventEmitter} from 'events';

// region interfaces

export enum RendezvousProtocol {UDP = 0, TCP}
export enum MessageType {DATA = 0, HANDSHAKE}

/**
 * @member port {number}: (optional) specifies the port to listen onto
 * @member host {string}: (optional) specifies the hosts to filter when listening
 * @member protocol {UDP | TCP}: (optional) specifies the protocol to use for the handshake
 * @member retry {number}: The retry interval for the holepunch
 */
export interface RendezvousOptions
{
    rendezvous: { port: number; host: string; };
    port?: number;
    host?: string;
    protocol?: RendezvousProtocol
    retry?: number;
}

/**
 * Interface representing the holepunch message.
 * @member id {string}: The id given for the holepunch
 * @member port {number}: Specifies the port to use for the holepunch
 * @member host {string}: Specifies the host to use for the holepunch
 * @member type {MessageType}: Specifies the message type (Handshake message or Holepunch message)
 * @member body {string|Buffer}: (optional) An optional body for the message
 */
export interface Message
{
    id: string;
    host: string;
    port: number;
    type: MessageType;
    body?: string | Buffer;
}

// endregion

/**
 * Class representing a peer
 * @author Marco Moschettini
 * @version 0.0.1
 * @class
 */
export class Peer extends EventEmitter
{
    private _socket: dgram.Socket;
    private _id: string;
    private _host: string;
    private _port: number;
    private _interval;
    private _retry_interval: number;
    private _rendezvous: {
        host: string,
        port: number
    };

    constructor(id: string, options: RendezvousOptions)
    {
        super();
        this._id = id;
        this._rendezvous = options.rendezvous;
        this._host = options && options.host || null;
        this._port = options && options.port || null;
        this._retry_interval = options && options.retry || 1000;

        this._socket = dgram.createSocket('udp4');
    }

    /**
     * Method that makes the peer listen on the the given port
     * @returns Promise <any>: resolved when peer has bound to the port
     */
    public listen(): Promise <any>
    {
        return new Promise((resolve) =>
        {
            this._socket.on('listening', () =>
            {
                this._socket.on('message', (message, sender) => this._receive(message, sender));
                this._socket.on('error', (error) =>
                {
                    this._socket.close();
                    this.emit('error', error);
                });

                resolve();
            });

            this._socket.bind(this._port, this._host);
        });
    }

    /**
     * Method that sends the handshake request to the rendezvous server
     * @param peer_id {string}: The id of the peer to connect to.
     */
    public get_connection_with(peer_id: string)
    {
        this._interval = setInterval(() =>
        {
            let data = JSON.stringify({"id": this._id, "remote": peer_id});
            this._socket.send(data, 0, data.length, this._rendezvous.port, this._rendezvous.host);
        }, this._retry_interval);
    }

    // region holepunch

    /**
     * Method that performs a receive when a new message from rendezvous server is received.
     * @param message {string|Buffer}: The received message
     * @param sender {dgram.AddressInfo}: Sender infos
     * @private
     */
    private _receive(message: string | Buffer, sender: dgram.AddressInfo)
    {
        try
        {
            let data: Message = JSON.parse(message as string);

            if(data.type)
            {
                if(data.type === MessageType.HANDSHAKE)
                {
                    clearInterval(this._interval);
                    this._holepunch(data);
                }
                else if(data.type === MessageType.DATA)
                {
                    this.emit("message", data, sender);
                }
            }
        }
        catch(error)
        {
            this.emit('error', error);
        }
    }

    /**
     * Method performing the actual holepunch
     * @param remote {Message}: The message to punch through the NAT.
     * @private
     */
    private _holepunch(remote: Message)
    {
        setInterval(function() {
            let data = JSON.stringify({
                type: MessageType.DATA,
                body: "PUNCH",
            });
            this._socket.send(data, 0, data.length, remote.port, remote.host);
        }, this._interval);
    }

    // endregion
}
