CREATE TABLE users (
    'LOGIN' VARCHAR PRIMARY KEY,
    'PASSWORD' VARCHAR NOT NULL,
    'RANK' VARCHAR NOT NULL DEFAULT 'NORMAL',
    CHECK (RANK IN ('NORMAL','VIP','ADMIN'))
);

CREATE TABLE canvas (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    owner VARCHAR NOT NULL,
    height INTEGER NOT NULL,
    length INTEGER NOT NULL,
    FOREIGN KEY(owner) REFERENCES users(login)
);

CREATE TABLE usersInCanva (
    idCanva VARCHAR,
    idUser VARCHAR,
    dernierePose TIMESTAMP,
    derniereDemande TIMESTAMP,
    FOREIGN KEY(idUser) REFERENCES users(login),
    FOREIGN KEY(idCanva) REFERENCES canvas(id),
    CONSTRAINT can_us PRIMARY KEY (idCanva, idUser)
);