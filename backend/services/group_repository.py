from sqlalchemy import select
from sqlalchemy.orm import Session

from models.group import Group


def create_group_db(db: Session, user_id: int, name: str) -> Group:
    group = Group(user_id=user_id, name=name)

    db.add(group)
    db.commit()
    db.refresh(group)

    return group


def list_groups_by_user_db(db: Session, user_id: int) -> list[Group]:
    statement = (
        select(Group)
        .where(Group.user_id == user_id)
        .order_by(Group.created_at.desc())
    )

    return list(db.execute(statement).scalars().all())


def get_group_db(db: Session, group_id: int) -> Group | None:
    return db.get(Group, group_id)


def delete_group_db(db: Session, group: Group) -> None:
    db.delete(group)
    db.commit()
