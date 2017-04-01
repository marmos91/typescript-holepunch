import {Peer} from './lib/Peer';

let peer = new Peer('PeerA', {
    rendezvous: {host: 'api.cubbit.net', port: 4321}
});

peer.listen().then(() =>
{
    console.log('Socket bound');
    peer.on('message', (message) =>
    {
        console.log(message.toString());
    });

    peer.get_connection_with('PeerB');
});