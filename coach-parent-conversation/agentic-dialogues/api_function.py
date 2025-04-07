from zhipuai import ZhipuAI


def call_api(sysprompt,userprompt):
    client = ZhipuAI(api_key="") # 填写您自己的APIKey
    response = client.chat.completions.create(
    model="glm-4-plus", 
    messages=[
        {"role": "system", "content": sysprompt},
        {"role": "user", "content": userprompt}
    ],
)
    return response.choices[0].message