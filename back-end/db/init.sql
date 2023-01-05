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
    width INTEGER NOT NULL,
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

CREATE TABLE history (

    idCanva VARCHAR,
    idUser VARCHAR,
    tempsPose TIMESTAMP,

    pxl_x INTEGER,
    pxl_y INTEGER,
    couleur VARCHAR,

    FOREIGN KEY(idUser) REFERENCES users(login),
    FOREIGN KEY(idCanva) REFERENCES canvas(id),
    CONSTRAINT can_us PRIMARY KEY (idCanva, idUser,tempsPose)
);

--CREATE TABLE idcanva (
--    pxl_x INTEGER,
--    pxl_y INTEGER,
--    couleur VARCHAR,
--    pose TIMESTAMP,
--    CONSTRAINT pxl_key PRIMARY KEY (pxl_x,pxl_y)
--);