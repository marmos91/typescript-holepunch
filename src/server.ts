import {Rendezvous} from './lib/Rendezvous';

let server = new Rendezvous();

server.on('error', (error) => console.error(error));
server.listen().then(() =>
{
    console.log(`Server listening...`);
});
