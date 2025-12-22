import requests, base64

url = "http://localhost:8081/v1/images/generations"
payload = {
  "prompt": "一只黑猫, 蓝帽子",
  "n": 1,
  "width": 128,
  "height": 128,
  "steps": 9,               # 直接传 steps
  "response_format": "b64_json",
  "output_format": "png"
}
r = requests.post(url, json=payload)
r.raise_for_status()
data = r.json()
b64 = data["data"][0]["b64_json"]
with open("out.png", "wb") as f:
    f.write(base64.b64decode(b64))
print("Saved out.png")