import {Peer} from '../src/lib/Peer';

let peer = new Peer('PeerA', {
    rendezvous: {host: 'api.cubbit.net', port: 4321},
    initiator: true
});

peer.listen().then(() =>
{
    peer.on('connection', (connection) =>
    {
        console.log('P2P connection established');
        connection.on('data', data => console.log(data.toString()));
        connection.send(Buffer.from(JSON.stringify({hello: 'hello'})));
    });
    peer.get_connection_with('PeerB');
});