import * as dgram from 'dgram';
import {EventEmitter} from 'events';
import utp = require('utp-native');

// region interfaces

export enum RendezvousProtocol {UDP = 0, TCP, UTP}
export enum MessageType {PAYLOAD = 0, HANDSHAKE, HOLEPUNCH, ACK}

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
    private _punch_interval;
    private _protocol: RendezvousProtocol;
    private _retry_interval: number;
    private _connected: boolean;
    private _rendezvous: {
        host: string,
        port: number
    };

    private _remote: {
        id: string,
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
        this._protocol = options && options.protocol || RendezvousProtocol.UDP;
        this._connected = false;

        this._socket = dgram.createSocket('udp4');
    }

    /**
     * Method that makes the peer listen on the the given port
     * @returns Promise <any>: resolved when peer has bound to the port
     */
    public listen(): Promise<any>
    {
        return new Promise((resolve) =>
        {
            this._socket.on('listening', () =>
            {
                console.log('Socket bound on port', this._socket.address().port);
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

    public send(data: Buffer, offset: number, length: number)
    {
        if(!this._connected)
            throw new Error('You are not connected yet');

        this._socket.send(data, offset, length, this._remote.port, this._remote.host);
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
        let data: Message;
        try
        {
            data = JSON.parse(message as string);
        }
        catch(error)
        {
            this.emit('error', error);
        }

        if(this._connected)
            this.emit('message', data.body);

        switch(data.type)
        {
            case(MessageType.HANDSHAKE):
            {
                clearInterval(this._interval);
                this._holepunch(data);
                break;
            }
            case(MessageType.HOLEPUNCH):
            {
                console.log('Received a punch packet, stopping punch');
                clearInterval(this._punch_interval);

                let data = JSON.stringify({type: MessageType.ACK});

                console.log('ACK packet sent');
                this._socket.send(data, 0, data.length, this._remote.port, this._remote.host);
                break;
            }
            case(MessageType.ACK):
            {
                console.log('Received an ACK packet');
                this._connected = true;

                let data = JSON.stringify({
                    type: MessageType.PAYLOAD,
                    body: 'Hello my dear',
                });

                console.log('Sending message', data);
                this._socket.send(data, 0, data.length, this._remote.port, this._remote.host);
                break;
            }
        }
    }

  /*  default:
        {
            throw new Error('Unknown packet received', data);
        }*/

    /**
     * Method performing the actual holepunch
     * @param remote {Message}: The message to punch through the NAT.
     * @private
     */
    private _holepunch(remote: Message)
    {
        console.log('Response received:', remote, 'Starting holepunch!!');
        this._remote = {id: remote.id, host: remote.host, port: remote.port};

        this._punch_interval = setInterval(() =>
        {
            console.log(`Holepunching on address ${this._remote.host}:${this._remote.port}`);

            let data = JSON.stringify({type: MessageType.HOLEPUNCH});

            this._socket.send(data, 0, data.length, this._remote.port, this._remote.host);
        }, this._retry_interval);
    }

    // endregion
}
