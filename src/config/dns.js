import dns from 'node:dns';

// Contourne les routeurs/FAI qui refusent les requêtes SRV de Node (mongodb+srv)
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}