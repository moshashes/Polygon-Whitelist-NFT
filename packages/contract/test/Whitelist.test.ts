import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Whitelist', function () {
    // すべてのテストで同じセットアップを再利用するために、フィクスチャを定義します。
    // loadFixture を使ってこのセットアップを一度実行し、その状態をスナップショットします。
    // そして、すべてのテストで Hardhat Network をそのスナップショットにリセットします。
    async function deployWhitelistFixture() {
        // コントラクトは、デフォルトで最初のsigner/accountを使用してデプロイされます。
        const [owner, alice, bob] = await ethers.getSigners();

        const whitelistFactory = await ethers.getContractFactory('Whitelist');
        const whitelist = await whitelistFactory.deploy([
            owner.address,
            alice.address,
        ]);

        return { whitelist, owner, alice, bob };
    }

    // テストケース
    describe('addToWhitelist', function () {
        context('when user is not owner', function () {
            it('reverts', async function () {
                // 準備
                const { whitelist, alice, bob } = await loadFixture(
                    deployWhitelistFixture,
                );

                // 実行と検証
                // コントラクトのオーナーではないアカウントがaddToWhitelist関数を実行しようとすると、エラーとなることを確認します。
                await expect(
                    whitelist.connect(alice).addToWhitelist(bob.address),
                ).to.be.revertedWith('Caller is not the owner');
            });
        });
        context('when address is already added', function () {
            it('reverts', async function () {
                const { whitelist, alice } = await loadFixture(deployWhitelistFixture);

                // 既にホワイトリストに追加されているaliceを追加しようとすると、エラーとなることを確認します。
                await expect(
                    whitelist.addToWhitelist(alice.address),
                ).to.be.revertedWith('Address already whitelisted');
            });
        });
        context('when adding a new address', function () {
            it('emit a AddToWhitelist event', async function () {
                const { whitelist, bob } = await loadFixture(deployWhitelistFixture);

                // AddToWhitelistイベントが発生することを確認します。
                await expect(whitelist.addToWhitelist(bob.address))
                    .to.emit(whitelist, 'AddToWhitelist')
                    .withArgs(bob.address);
            });
        });
    });

    describe('removeFromWhitelist', function () {
        context('when user is not owner', function () {
            it('reverts', async function () {
                const { whitelist, alice, bob } = await loadFixture(
                    deployWhitelistFixture,
                );

                // コントラクトのオーナーではないアカウントが、removeFromWhitelist関数を実行しようとすると、エラーとなることを確認します。
                await expect(
                    whitelist.connect(alice).removeFromWhitelist(bob.address),
                ).to.be.revertedWith('Caller is not the owner');
            });
        });
        context('when an address is not in whitelist', function () {
            it('reverts', async function () {
                const { whitelist, bob } = await loadFixture(deployWhitelistFixture);

                // ホワイトリストに存在しないbobを削除しようとすると、エラーとなることを確認します。
                await expect(
                    whitelist.removeFromWhitelist(bob.address),
                ).to.be.revertedWith('Address not in whitelist');
            });
        });
        context('when removing an address', function () {
            it('emit a RemoveFromWhitelist event', async function () {
                const { whitelist, alice } = await loadFixture(deployWhitelistFixture);

                // RemoveFromWhitelistイベントが発生することを確認します。
                await expect(whitelist.removeFromWhitelist(alice.address))
                    .to.emit(whitelist, 'RemoveFromWhitelist')
                    .withArgs(alice.address);
            });
        });
    });

    describe('whitelistedAddresses', function () {
        context('when an address is not in whitelist', function () {
            it('returns false', async function () {
                const { whitelist, bob } = await loadFixture(deployWhitelistFixture);

                // ホワイトリストに存在しないbobを指定すると、falseが返されることを確認します。
                expect(await whitelist.whitelistedAddresses(bob.address)).to.be.false;
            });
        });
        context('when an address is in whitelist', function () {
            it('returns true', async function () {
                const { whitelist, alice } = await loadFixture(deployWhitelistFixture);

                // ホワイトリストに存在するaliceを指定すると、trueが返されることを確認します。
                expect(await whitelist.whitelistedAddresses(alice.address)).to.be.true;
            });
        });
    });
});