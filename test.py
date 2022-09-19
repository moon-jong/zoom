from minio.api import Minio
client = Minio('218.145.204.234:9000',
               access_key='huinnoai',
               secret_key='memo0301!',
               secure=False)

client.fget_object('sec10', 'sec10_classification.pth', 'sec10_classification.pth', request_headers=None)
