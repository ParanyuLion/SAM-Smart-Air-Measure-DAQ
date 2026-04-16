from machine import Pin, ADC
import time
import network
import ujson
from umqtt.simple import MQTTClient
import confighome as config

mq9_adc = ADC(Pin(32)) 
mq9_adc.atten(ADC.ATTN_11DB)

mq2_adc = ADC(Pin(33)) 
mq2_adc.atten(ADC.ATTN_11DB)

data_from_b1 = None

def sub_cb(topic, msg):
    global data_from_b1
    try:
        data_from_b1 = ujson.loads(msg)
        print("--- Received data from Board 1 ---")
    except:
        print("Error decoding Board 1 data")

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(config.WIFI_SSID, config.WIFI_PASS)
        while not wlan.isconnected():
            time.sleep(1)
    print('Board 2 WiFi Connected:', wlan.ifconfig()[0])

def connect_mqtt():
    client = MQTTClient(client_id="B6710545784_Board2",
                        server=config.MQTT_BROKER,
                        user=config.MQTT_USER,
                        password=config.MQTT_PASS)
    client.set_callback(sub_cb)
    client.connect()
    topic_sub = "b6710545784/sam/sensor/board1"
    client.subscribe(topic_sub)
    print(f'Subscribed to: {topic_sub}')
    return client

# --- Main Logic ---
connect_wifi()
mqtt_client = None

while True:
    # Check Connection
    wlan = network.WLAN(network.STA_IF)
    if not wlan.isconnected() or mqtt_client is None:
        try:
            connect_wifi()
            mqtt_client = connect_mqtt()
        except:
            print("Connection failed, retrying...")
            time.sleep(5)
            continue

    try:
        mqtt_client.check_msg()

        if data_from_b1 is not None:
            co_val = mq9_adc.read()
            smoke_val = mq2_adc.read()

            combined_payload = {
                "b1": data_from_b1,
                "b2": {
                    "co_raw": co_val,
                    "smoke_raw": smoke_val
                },
                "place": "inside"
            }

            final_topic = "b6710545784/sam/sensor/combined"
            mqtt_client.publish(final_topic, ujson.dumps(combined_payload))
            
            print(f"Aggregated & Published: {combined_payload}")
            
            data_from_b1 = None 

    except Exception as e:
        print("Loop Error:", e)
        mqtt_client = None
    
    time.sleep(1)
