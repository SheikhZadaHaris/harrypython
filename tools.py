from fastapi import APIRouter
from pydantic import BaseModel
import ast
import operator
from datetime import datetime

router = APIRouter(prefix="/api/tools")

class MathRequest(BaseModel):
    expression: str

@router.post("/calculate")
async def calculate(req: MathRequest):
    # Simple safe eval using ast
    def eval_expr(expr):
        try:
            node = ast.parse(expr, mode='eval').body
            def _eval(node):
                if isinstance(node, ast.Constant):
                    return node.n
                elif isinstance(node, ast.BinOp):
                    op_map = {
                        ast.Add: operator.add, ast.Sub: operator.sub, 
                        ast.Mult: operator.mul, ast.Div: operator.truediv,
                        ast.Mod: operator.mod, ast.Pow: operator.pow
                    }
                    return op_map[type(node.op)](_eval(node.left), _eval(node.right))
                elif isinstance(node, ast.UnaryOp):
                    op_map = {ast.USub: operator.neg, ast.UAdd: operator.pos}
                    return op_map[type(node.op)](_eval(node.operand))
                else:
                    raise ValueError("Unsupported math expression")
            return _eval(node)
        except Exception:
            return None

    result = eval_expr(req.expression)
    if result is not None:
        return {"result": result}
    return {"error": "Invalid expression"}

@router.get("/datetime")
async def get_datetime():
    now = datetime.now()
    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "timezone": str(now.astimezone().tzinfo)
    }
