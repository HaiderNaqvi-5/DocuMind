from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import DATABASE_URL


pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    kwargs={
        "row_factory": dict_row,
    },
)


def query(
    sql: str,
    params: tuple | None = None,
) -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                sql,
                params,
            )

            if cursor.description is None:
                return []

            return cursor.fetchall()


def execute(
    sql: str,
    params: tuple | None = None,
) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                sql,
                params,
            )

        conn.commit()


def close_pool() -> None:
    pool.close()