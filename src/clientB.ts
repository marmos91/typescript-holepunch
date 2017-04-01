import {Peer} from './lib/Peer';

let peer = new Peer('PeerB', {
    rendezvous: {host: 'api.cubbit.net', port: 4321}
});

peer.listen().then(() =>
{
    peer.on('message', (message) =>
    {
        console.log(message.toString());
    });

    peer.get_connection_with('PeerA');
});