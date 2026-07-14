import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

class CryptoError(Exception):
    pass

def decrypt_credential(stored: str, key_hex: str) -> str:
    """
    Decrypts a versioned AES-256-GCM string formatted as:
    v{version}:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}
    
    Uses standard key size (32 bytes / 256 bits) and supports Node's 16-byte random IVs.
    """
    if not stored or not isinstance(stored, str):
        raise CryptoError("Invalid encrypted credential value")
        
    if not stored.startswith('v'):
        raise CryptoError("Invalid encrypted credential format (missing version prefix)")
        
    try:
        parts = stored.split(':')
        if len(parts) != 4:
            raise CryptoError("Malformed encrypted credential components")
            
        ver_str, iv_hex, tag_hex, ct_hex = parts
        
        # We parse the version (e.g. "v1" -> 1)
        try:
            version = int(ver_str[1:])
        except ValueError:
            raise CryptoError(f"Invalid key version: {ver_str}")
            
        key = bytes.fromhex(key_hex)
        if len(key) != 32:
            raise CryptoError("Encryption key must be 32 bytes (64 hex characters)")
            
        iv = bytes.fromhex(iv_hex)
        tag = bytes.fromhex(tag_hex)
        ciphertext = bytes.fromhex(ct_hex)
        
        decryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        ).decryptor()
        
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return plaintext.decode('utf-8')
    except Exception as e:
        if isinstance(e, CryptoError):
            raise e
        raise CryptoError(f"Credential decryption failed: {str(e)}")

def encrypt_credential(plaintext: str, key_hex: str, key_version: int = 1) -> str:
    """
    Encrypts a plaintext string using AES-256-GCM and formats as:
    v{version}:{iv_hex}:{auth_tag_hex}:{ciphertext_hex}
    
    Generates a 16-byte random IV to match the legacy Node.js configuration.
    """
    if not plaintext:
        raise CryptoError("Plaintext cannot be empty")
        
    try:
        key = bytes.fromhex(key_hex)
        if len(key) != 32:
            raise CryptoError("Encryption key must be 32 bytes (64 hex characters)")
            
        # Node uses 16-byte random IV (IV_LENGTH = 16)
        iv = os.urandom(16)
        
        encryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        ).encryptor()
        
        ciphertext = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
        tag = encryptor.tag
        
        return f"v{key_version}:{iv.hex()}:{tag.hex()}:{ciphertext.hex()}"
    except Exception as e:
        if isinstance(e, CryptoError):
            raise e
        raise CryptoError(f"Credential encryption failed: {str(e)}")
