-- CreateTable
CREATE TABLE "barang" (
    "id" SERIAL NOT NULL,
    "kode_produk" VARCHAR(255) NOT NULL,
    "nama_produk" VARCHAR(255) NOT NULL,
    "kategori" VARCHAR(255) NOT NULL,
    "sub_kategori" VARCHAR(255) DEFAULT '',
    "satuan" VARCHAR(255) NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal_expired" VARCHAR(255) NOT NULL,
    "tanggal_masuk" VARCHAR(255),
    "lokasi" VARCHAR(255),
    "penerima" VARCHAR(255) DEFAULT '',
    "is_no_expired" INTEGER DEFAULT 0,
    "is_arsip" INTEGER DEFAULT 0,
    "no_penerimaan" VARCHAR(255) DEFAULT '',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori" (
    "id" SERIAL NOT NULL,
    "nama_kategori" VARCHAR(255) NOT NULL,

    CONSTRAINT "kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lokasi" (
    "id" SERIAL NOT NULL,
    "nama_lokasi" VARCHAR(255) NOT NULL,

    CONSTRAINT "lokasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satuan" (
    "id" SERIAL NOT NULL,
    "nama_satuan" VARCHAR(255) NOT NULL,

    CONSTRAINT "satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) DEFAULT '',
    "password" VARCHAR(255) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'OPERATOR_INVENTARIS',
    "status" VARCHAR(20) DEFAULT 'active',
    "totp_secret" VARCHAR(255),
    "is_2fa_enabled" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nama_barang" (
    "id" SERIAL NOT NULL,
    "kode" VARCHAR(255) DEFAULT '',
    "nama" VARCHAR(255) NOT NULL,
    "kategori" VARCHAR(255) DEFAULT '',
    "sub_kategori" VARCHAR(255) DEFAULT '',
    "satuan" VARCHAR(255) DEFAULT '',
    "lokasi" VARCHAR(255) DEFAULT '',

    CONSTRAINT "nama_barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pemakaian" (
    "id" SERIAL NOT NULL,
    "no_order" VARCHAR(255) DEFAULT '',
    "kode_produk" VARCHAR(255) NOT NULL,
    "nama_produk" VARCHAR(255) NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal_pemakaian" VARCHAR(255) NOT NULL,
    "penerima" VARCHAR(255) DEFAULT '',
    "keterangan" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pemakaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_kategori" (
    "id" SERIAL NOT NULL,
    "kategori_id" INTEGER NOT NULL,
    "nama_sub_kategori" VARCHAR(255) NOT NULL,

    CONSTRAINT "sub_kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan" (
    "key_name" VARCHAR(255) NOT NULL,
    "value_text" TEXT,

    CONSTRAINT "pengaturan_pkey" PRIMARY KEY ("key_name")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "menu_key" VARCHAR(100) NOT NULL,
    "is_visible" INTEGER DEFAULT 1,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_categories" (
    "id" SERIAL NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "nama_kategori" VARCHAR(255) NOT NULL,

    CONSTRAINT "role_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kategori_nama_kategori_key" ON "kategori"("nama_kategori");

-- CreateIndex
CREATE UNIQUE INDEX "lokasi_nama_lokasi_key" ON "lokasi"("nama_lokasi");

-- CreateIndex
CREATE UNIQUE INDEX "satuan_nama_satuan_key" ON "satuan"("nama_satuan");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "nama_barang_nama_key" ON "nama_barang"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "unique_kategori_sub" ON "sub_kategori"("kategori_id", "nama_sub_kategori");

-- CreateIndex
CREATE UNIQUE INDEX "unique_role_menu" ON "role_permissions"("role", "menu_key");

-- CreateIndex
CREATE UNIQUE INDEX "unique_role_kat" ON "role_categories"("role", "nama_kategori");

