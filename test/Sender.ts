import {Peer} from '../src/lib/Peer';

let peer = new Peer('PeerA', {
    rendezvous: {host: 'localhost', port: 4321},
    initiator: true
});

peer.listen().then(() =>
{
    peer.on('connection', (connection) =>
    {
        connection.on('data', data => console.log(data.toString()));
        connection.send(Buffer.from(JSON.stringify({hello: 'hello'})));
    });
    peer.get_connection_with('PeerB');
});