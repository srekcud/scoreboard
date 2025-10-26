# pays + NM actif
sudo raspi-config nonint do_wifi_country BE || true
systemctl is-active NetworkManager

# créer l’AP 2.4 GHz, canal 6, DHCP/NAT partagés
sudo nmcli con add type wifi ifname wlan0 con-name ap ssid "SCOREBOARD"
sudo nmcli con modify ap 802-11-wireless.mode ap 802-11-wireless.band bg 802-11-wireless.channel 6
sudo nmcli con modify ap wifi-sec.key-mgmt wpa-psk wifi-sec.psk "MOTDEPASSE1234"
sudo nmcli con modify ap ipv4.method shared ipv4.addresses 10.0.0.1/24
sudo nmcli con modify ap connection.autoconnect yes connection.autoconnect-priority 100
sudo nmcli con up ap

# anti coupures
sudo tee /etc/NetworkManager/conf.d/wifi-powersave-off.conf >/dev/null <<'EOF'
[connection]
wifi.powersave = 2
EOF
sudo systemctl restart NetworkManager

# vérif
nmcli dev status
ip a show wlan0
