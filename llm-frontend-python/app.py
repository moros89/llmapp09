import requests
from config import BACKEND_URL, DEBUG, FLASK_PORT
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/ai/<analysis_type>', methods=['POST'])
def proxy_analysis(analysis_type):
    allowed_types = ('summarize', 'sentiment', 'intent', 'classify')
    if analysis_type not in allowed_types:
        return jsonify({'error': f'Invalid analysis type: {analysis_type}'}), 400

    try:
        resp = requests.post(
            f'{BACKEND_URL}/api/ai/{analysis_type}',
            json=request.get_json(),
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        payload = resp.json() if resp.content else {}
        if resp.status_code >= 400 and 'error' not in payload:
            detail = payload.get('detail')
            if detail:
                payload = {'error': detail if isinstance(detail, str) else str(detail)}
        return jsonify(payload), resp.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Cannot connect to backend service'}), 502
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Backend service timed out'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 502
    except ValueError as e:
        return jsonify({'error': f'Invalid response from backend: {e}'}), 502


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=DEBUG)
