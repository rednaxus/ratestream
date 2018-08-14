apt-get update

apt-get install -y sendmail sendmail-cf m4 \
    && hostname >> /etc/mail/relay-domains \
    && m4 /etc/mail/sendmail.mc > /etc/mail/sendmail.cf

rm -rf /var/lib/apt/lists/*

#remove localhost limit
sed -i -e "s/Port=smtp,Addr=127.0.0.1, Name=MTA/Port=smtp, Name=MTA/g" \
    /etc/mail/sendmail.mc
sendmail -bd

# one-liner mail test:
# echo -e "To: aleph@on40.org\nSubject: Test\nTest\n" | sendmail -bm -t -v

