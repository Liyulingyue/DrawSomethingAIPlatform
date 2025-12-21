import torch
from optimum.intel import OVZImagePipeline

# 1. 加载管道
pipe = OVZImagePipeline.from_pretrained(
    "../Models_Converted/Z-Image-Turbo/INT4", device="cpu"
)

# 2. 设置提示词
prompt = "Young Chinese woman in red Hanfu, intricate embroidery. Impeccable makeup, red floral forehead pattern. Elaborate high bun, golden phoenix headdress, red flowers, beads. Holds round folding fan with lady, trees, bird. Neon lightning-bolt lamp (⚡️), bright yellow glow, above extended left palm. Soft-lit outdoor night background, silhouetted tiered pagoda (西安大雁塔), blurred colorful distant lights."
# prompt = "苹果和橘子放在一个蓝色的盘子里，背景是木制的桌子。"

# 3. 生成图像
import time
print("Generating image...")
start_time = time.time()
image = pipe(
    prompt=prompt,
    # height=512,
    # width=512,
    height=128,
    width=128,
    num_inference_steps=9,  # 实际执行 8 次 DiT 前向传播
    guidance_scale=0.0,     # Turbo 模型的引导尺度应为 0
    generator=torch.Generator("cpu").manual_seed(42),
).images[0]
end_time = time.time()
print(f"生成图像耗时: {end_time - start_time:.2f} 秒")

# 4. 保存图像
image.save("example_zimage_ov.png")