import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Clean up database URL query parameters for asyncpg compatibility
db_url = settings.DATABASE_URL
connect_args = {}

if db_url and ("sslmode=" in db_url or "ssl=" in db_url or "channel_binding=" in db_url):
    parsed = urllib.parse.urlparse(db_url)
    query = urllib.parse.parse_qs(parsed.query)
    
    # Handle sslmode (e.g. sslmode=require)
    if "sslmode" in query:
        sslmode = query["sslmode"][0]
        if sslmode in ("require", "verify-ca", "verify-full", "prefer"):
            connect_args["ssl"] = True
            
    # Handle ssl (e.g. ssl=true)
    if "ssl" in query:
        ssl_val = query["ssl"][0]
        if ssl_val.lower() in ("true", "require", "yes", "1"):
            connect_args["ssl"] = True
            
    # Rebuild the URL without the sslmode, ssl, and channel_binding query parameters to prevent asyncpg TypeErrors
    query_params = {k: v for k, v in query.items() if k not in ("sslmode", "ssl", "channel_binding")}
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    db_url = urllib.parse.urlunparse(
        (parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment)
    )


engine = create_async_engine(
    db_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=connect_args,
)


async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    async with engine.begin() as conn:
        from app.models import customer, persona, segment, campaign, decision_log, activity, opportunity  # noqa: F401
        from app.models import campaign_message, callback_event, dispatch_job  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
