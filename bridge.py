import os
import platform
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # React app se requests allow karne ke liye

@app.route('/pc-control', methods=['POST'])
def pc_control():
    data = request.json
    action = data.get('action')
    
    system = platform.system().lower()
    
    if action == 'shutdown':
        print("System Shutdown initiated...")
        if system == "windows":
            os.system("shutdown /s /t 1")
        else:
            os.system("shutdown -h now")
        return jsonify({"status": "success", "message": "Shutdown command sent"})
        
    elif action == 'restart':
        print("System Restart initiated...")
        if system == "windows":
            os.system("shutdown /r /t 1")
        else:
            os.system("reboot")
        return jsonify({"status": "success", "message": "Restart command sent"})
        
    return jsonify({"status": "error", "message": "Invalid action"}), 400

if __name__ == '__main__':
    print("Omni-Bridge Server running on http://localhost:5000")
    app.run(port=5000)
