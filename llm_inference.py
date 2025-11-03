# llm_inference.py
import os
import sys
import traceback
from ctransformers import AutoModelForCausalLM

# 파일명으로 모델 타입 추정
def guess_model_type(filename: str) -> str | None:
    f = filename.lower()
    # 우선순위: 파일명에 흔히 포함되는 토큰 기반
    if 'mistral' in f:
        return 'mistral'
    if 'phi-3' in f or 'phi3' in f or 'phi' in f:
        return 'phi3'
    if 'qwen2' in f or 'qwen' in f:
        return 'qwen2'
    if 'llama-3.1' in f or 'llama-3' in f or 'llama' in f:
        return 'llama'
    return None

def pick_biggest_gguf(model_path: str) -> tuple[str, str]:
    # model_path가 디렉터리면 그 안의 gguf 중 가장 큰 파일을 선택
    if os.path.isdir(model_path):
        ggufs = [f for f in os.listdir(model_path) if f.lower().endswith('.gguf')]
        if not ggufs:
            raise FileNotFoundError(f"'{model_path}' 폴더에 .gguf 파일이 없습니다.")
        ggufs.sort(key=lambda f: os.path.getsize(os.path.join(model_path, f)), reverse=True)
        fn = ggufs[0]
        return model_path, fn
    # 파일 경로면 디렉터리/파일명 분리
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"모델을 찾을 수 없습니다: {model_path}")
    return os.path.dirname(model_path), os.path.basename(model_path)

def load_and_infer(model_dir: str, model_file: str, model_types: list[str], prompt: str) -> str:
    # 스레드 설정(코어 절반, 최소 2)
    threads = max(2, (os.cpu_count() or 4) // 2)

    last_err = None
    for mtype in model_types:
        try:
            print(f"[try] model_type={mtype} file={model_file}", file=sys.stderr)
            llm = AutoModelForCausalLM.from_pretrained(
                model_dir,
                model_file=model_file,
                model_type=mtype,
                gpu_layers=0,
                threads=threads,
            )
            system = "You are a friendly Korean journaling assistant. Keep answers concise and supportive."
            full = f"{system}\nUser: {prompt}\nAssistant:"
            out = llm(full, max_new_tokens=256, temperature=0.7, stream=False)
            return (out or "").strip() or "빈 응답"
        except Exception as e:
            last_err = e
            print(f"[fail] {mtype}: {e}", file=sys.stderr)
            continue
    raise RuntimeError(f"모든 모델 타입 시도가 실패했습니다: {model_types}\n마지막 오류: {last_err}")

def main():
    if len(sys.argv) < 3:
        print("사용법: python llm_inference.py <MODEL_PATH(.gguf 또는 디렉터리)> <MESSAGE>")
        sys.exit(1)

    raw = os.path.abspath(sys.argv[1])
    message = sys.argv[2]

    try:
        model_dir, model_file = pick_biggest_gguf(raw)
        # 1차: 파일명으로 타입 추정 → 2차: 넓은 후보군 폴백
        primary = guess_model_type(model_file)
        tried = [primary] if primary else []
        # 폴백 후보군 (ctransformers가 지원하는 범주 내)
        fallback = ['llama', 'mistral', 'phi3', 'qwen2']
        # 중복 제거하며 시도 순서 구성
        model_types = [t for t in ([primary] + fallback) if t and t not in tried]

        print(f"[debug] model_dir={model_dir}", file=sys.stderr)
        print(f"[debug] model_file={model_file}", file=sys.stderr)
        print(f"[debug] try order={model_types}", file=sys.stderr)

        text = load_and_infer(model_dir, model_file, model_types, message)
        print(text)

    except Exception as e:
        print(f"오류: {e}")
        traceback.print_exc()
        sys.exit(2)

if __name__ == "__main__":
    main()
