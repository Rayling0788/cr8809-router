import os, paramiko, hashlib, base64

def connect_router():
    c=paramiko.SSHClient();c.load_system_host_keys()
    c.connect('192.168.1.1',username='root',password=os.environ['ROUTER_PASS'],timeout=15)
    return c

def connect_server():
    t=paramiko.Transport(('8.163.113.0',22));t.start_client(timeout=15)
    fingerprint=base64.b64encode(hashlib.sha256(t.get_remote_server_key().asbytes()).digest()).decode().rstrip('=')
    if fingerprint!='W6Tuw73kILqKGfzgTSUz7sfaSCxAaFajy0bPoHbK494':
        t.close();raise RuntimeError('Server host key changed')
    t.auth_password('root',os.environ['SERVER_PASS'])
    c=paramiko.SSHClient();c._transport=t
    return c

def run(c,cmd,check=True):
    i,o,e=c.exec_command(cmd,timeout=90)
    out=o.read().decode();err=e.read().decode();code=o.channel.recv_exit_status()
    if check and code:raise RuntimeError(f'Exit {code}: {err} {out}')
    return out

def put(c,path,data,mode='600'):
    import shlex
    i,o,e=c.exec_command('umask 077; cat > '+shlex.quote(path))
    i.write(data.encode() if isinstance(data,str) else data);i.channel.shutdown_write()
    if o.channel.recv_exit_status():raise RuntimeError(e.read().decode())
    run(c,'chmod '+mode+' '+shlex.quote(path))
