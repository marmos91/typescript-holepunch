import {Peer} from '../src/lib/Peer';

let peer = new Peer('PeerB', {
    rendezvous: {host: 'api.cubbit.net', port: 4321}
});

peer.listen().catch(error => console.error(error));