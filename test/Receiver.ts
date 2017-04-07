import {Peer} from '../src/lib/Peer';

let peer = new Peer('PeerB', {
    rendezvous: {host: 'api.cubbit.net', port: 4321}
});

peer.listen().then(() =>
{
    peer.on('connection', (connection) =>
    {
       connection.on('data', (data) =>
       {
           console.log(data.toString());
       });

       connection.on('error', error => console.error(error));
       connection.on('close', () => console.log('Connection closed'));
    });
    peer.on('error', error => console.error(error));
    peer.on('close', () => console.log('Peer closed'));
});