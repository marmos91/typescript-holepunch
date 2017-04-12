import {Peer} from '../src/lib/Peer';

let peer = new Peer('PeerA', {
    rendezvous: {host: 'api.cubbit.net', port: 4321},
    initiator: true
});

peer.listen().then(() =>
{
    peer.get_connection_with('PeerB');
});