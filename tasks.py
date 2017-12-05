from microsoftbotframework import ReplyToActivity
import aiohttp
import subprocess


def echo_response(message):
    if message['text'] == "!":
        subprocess.call(['run.cmd'])
        ReplyToActivity(fill=message,
                        text=message["text"] + "1").send()


def cat(message):
    if message['text'] == ".cat":
        ReplyToActivity(fill=message,
                        text="meow").send()
