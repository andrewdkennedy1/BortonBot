from microsoftbotframework import ReplyToActivity
import aiohttp
import subprocess


def echo_response(message):
    if message['text'] == "msg":
        subprocess.call(['run.cmd'])
        ReplyToActivity(fill=message,
                        text="Message Sent Successfully").send()


def help(message):
    if message['text'] == "help":
        ReplyToActivity(fill=message,
                        text="RTFM").send()
