import socket
import sys

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", 1025))
    server.listen(50)
    print("Dummy SMTP sink running on 127.0.0.1:1025")
    sys.stdout.flush()

    while True:
        try:
            conn, addr = server.accept()
            conn.settimeout(5.0)
            conn.sendall(b"220 localhost ESMTP Fleet-Sink\r\n")
            in_data = False
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                cmd = data.decode("utf-8", errors="ignore").upper()
                if in_data:
                    if b"\r\n.\r\n" in data or data.endswith(b"\n.\r\n") or data == b".\r\n":
                        in_data = False
                        conn.sendall(b"250 2.0.0 Ok: queued\r\n")
                else:
                    if cmd.startswith("EHLO") or cmd.startswith("HELO"):
                        conn.sendall(b"250-localhost\r\n250-SIZE 35882577\r\n250-AUTH LOGIN PLAIN\r\n250 OK\r\n")
                    elif cmd.startswith("AUTH"):
                        conn.sendall(b"235 2.7.0 Authentication successful\r\n")
                    elif cmd.startswith("MAIL FROM"):
                        conn.sendall(b"250 2.1.0 Ok\r\n")
                    elif cmd.startswith("RCPT TO"):
                        conn.sendall(b"250 2.1.5 Ok\r\n")
                    elif cmd.startswith("DATA"):
                        in_data = True
                        conn.sendall(b"354 End data with <CR><LF>.<CR><LF>\r\n")
                    elif cmd.startswith("QUIT"):
                        conn.sendall(b"221 2.0.0 Bye\r\n")
                        break
                    elif cmd.startswith("RSET") or cmd.startswith("NOOP"):
                        conn.sendall(b"250 Ok\r\n")
                    else:
                        conn.sendall(b"250 Ok\r\n")
            conn.close()
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

if __name__ == "__main__":
    main()

