from machine import UART, Pin, ADC
import time
import dht
import network
import ujson
from umqtt.simple import MQTTClient
import confighome as config  # ต้องมีไฟล์ config.py ที่ระบุ WIFI และ MQTT ไว้

uart = UART(1, baudrate=9600, tx=19, rx=23)
sensor_dht = dht.DHT11(Pin(32, Pin.IN, Pin.PULL_UP))
ky028_adc = ADC(Pin(33))
ky028_adc.atten(ADC.ATTN_11DB)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(config.WIFI_SSID, config.WIFI_PASS)
        while not wlan.isconnected():
            time.sleep(1)
    print('WiFi Connected:', wlan.ifconfig()[0])

def connect_mqtt():
    client = MQTTClient(client_id="",
                  server=config.MQTT_BROKER,
                  user=config.MQTT_USER,
                  password=config.MQTT_PASS)
    client.connect()
    print('MQTT Broker Connected!')
    return client

def get_ky028_temp(raw_adc):
    if raw_adc <= 0 or raw_adc >= 4095: return 0
    reference_raw = 2288
    reference_temp = 30.0
    temp = reference_temp + (reference_raw - raw_adc) * 0.021
    return temp

def read_and_send(client):
    t_dht, h_dht = 0, 0
    t_ky028 = 0
    pm10_env, pm25_env, pm100_env = 0, 0, 0 

    try:
        sensor_dht.measure()
        t_dht = sensor_dht.temperature()
        h_dht = sensor_dht.humidity()
    except: 
        print("DHT11 Error")

    t_raw = ky028_adc.read()
    t_ky028 = round(get_ky028_temp(t_raw), 1)


    if uart.any() >= 32:
        data = uart.read(32)
        if data[0] == 0x42 and data[1] == 0x4d:
            pm10_env  = data[10] << 8 | data[11] # PM1.0
            pm25_env  = data[12] << 8 | data[13] # PM2.5
            pm100_env = data[14] << 8 | data[15] # PM10.0
        else:
            uart.read(uart.any())


    payload = {
        "temp_dht": t_dht,
        "temp_ky": t_ky028,
        "humidity": h_dht,
        "pm10": pm10_env,
        "pm25": pm25_env,
        "pm100": pm100_env,
    }
    
    topic = "b6710545784/sam/sensor/board1"
    try:
        client.publish(topic, ujson.dumps(payload))
        print(f"Published: {payload}")
    except Exception as e:
        print("MQTT Publish Error:", e)

# --- Main Loop ---
connect_wifi()
mqtt_client = None

print("Warming up sensors...")
time.sleep(2)
try:
    sensor_dht.measure()
    print("DHT11 Ready!")
except:
    print("DHT11 initializing...")

while True:
    wlan = network.WLAN(network.STA_IF)
    if not wlan.isconnected():
        connect_wifi()
        mqtt_client = None

    if mqtt_client is None:
        try:
            mqtt_client = connect_mqtt()
        except:
            print("Retrying MQTT...")
            time.sleep(5)
            continue

    try:
        read_and_send(mqtt_client)
    except Exception as e:
        print("Error during send:", e)
        mqtt_client = None
    
    print("Sleeping for 10 minutes...")
    time.sleep(600)
