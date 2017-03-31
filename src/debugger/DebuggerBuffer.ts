/**
 * Thin extension of Node.js Buffer class, with a few helper methods.
 */

export class DebuggerBufferReader {
    private buffer: Buffer;
    private pos: number = 0;

    public constructor(buffer: Buffer) {
        this.buffer = buffer;
    }

    public readBoolean(): boolean {
        const val = this.readInt8();
        return (val === 1);
    }

    public readInt8(): number {
        const val = this.buffer.readInt8(this.pos);
        this.pos += 1;
        return val;
    }

    public readInt16(): number {
        const val = this.buffer.readInt16BE(this.pos);
        this.pos += 2;
        return val;
    }

    public readInt32(): number {
        const val = this.buffer.readInt32BE(this.pos);
        this.pos += 4;
        return val;
    }

    public readInt64(): number {
        const val = this.buffer.readIntBE(this.pos, 8);
        this.pos += 8;
        return val;
    }

    public readString(): string {
        const size = this.readInt32();
        const val = this.buffer.toString(null, this.pos, this.pos + size);
        this.pos += size;
        return val;
    }

    public readObj<T extends IDebuggerBufferReadable>(c: { new (): T; }): T {
        const value = new c();
        value.receive(this);
        return value;
    }

    public readArray<T extends IDebuggerBufferReadable>(c: { new (): T; }): T[] {
        const len = this.readInt32();
        const values: T[] = [];
        for (let i = 0; i < len; i += 1) {
            const idx = this.readBoolean();
            if (idx) {
                const value = this.readObj(c);
                values.push(value);
            }
        }
        return values;
    }

    public readArrayPtr<T extends IDebuggerBufferReadable>(c: { new (): T; }): T[] {
        const len = this.readInt16();
        const values: T[] = [];
        for (let i = 0; i < len; i += 1) {
            const value = this.readObj(c);
            values.push(value);
        }
        return values;
    }
}

export class DebuggerBufferWriter {
    private buffer: Buffer = new Buffer('');

    public writeInt8(value: number) {
        const newbuf = new Buffer(1);
        newbuf.writeInt8(value, 0);
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeInt16(value: number) {
        const newbuf = new Buffer(2);
        newbuf.writeInt16BE(value, 0);
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeInt32(value: number) {
        const newbuf = new Buffer(4);
        newbuf.writeUInt32BE(value, 0);
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeInt64(value: number) {
        const newbuf = new Buffer(8);
        newbuf.writeUIntBE(value, 0, 8);
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeBoolean(value: boolean) {
        const newbuf = new Buffer(1);
        newbuf.writeInt8(value ? 1 : 0, 0);
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeString(value: string) {
        const len = value.length;
        const newbuf = new Buffer(len + 4);
        newbuf.writeUInt32BE(len, 0);
        if (len > 0) {
            newbuf.write(value, 4);
        }
        this.buffer = Buffer.concat([this.buffer, newbuf]);
    }

    public writeArray<T extends IDebuggerBufferReadable>(values: T[]) {
        const len = values.length;
        this.writeInt32(len);
        values.forEach(value => {
            this.writeBoolean(true);
            value.send(this);
        });
        return values;
    }

    public writeArrayPtr<T extends IDebuggerBufferReadable>(values: T[]) {
        const len = values.length;
        this.writeInt16(len);
        values.forEach(value => {
            value.send(this);
        });
        return values;
    }

    public getBuffer(): Buffer {
        return this.buffer;
    }
}

export interface IDebuggerBufferReadable {
    receive(buffer: DebuggerBufferReader);
    send(buffer: DebuggerBufferWriter);
}
