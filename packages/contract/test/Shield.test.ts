import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Shield', function () {
    async function deployWhitelistFixture() {
        const dummyBaseURI = 'ipfs://dummyBaseURI';

        const [owner, alice, bob] = await ethers.getSigners();

        const whitelistFactory = await ethers.getContractFactory('Whitelist');
        const whitelist = await whitelistFactory.deploy([
            owner.address,
            alice.address,
        ]);
        const shieldFactory = await ethers.getContractFactory('Shield');
        const shield = await shieldFactory.deploy(dummyBaseURI, whitelist.address);

        // Shieldコントラクトからpublic変数を取得します。
        const price = await shield.price();
        const maxTokenIds = await shield.maxTokenIds();

        return { shield, price, maxTokenIds, owner, alice, bob };
    }

    describe('setPaused', function () {
        context('when user is not owner', function () {
            it('reverts', async function () {
                const { shield, alice } = await loadFixture(deployWhitelistFixture);

                // コントラクトのオーナーではないアカウントが、setPaused関数を実行しようとするとエラーとなることを確認します。
                await expect(shield.connect(alice).setPaused(true))
                    .to.be.revertedWithCustomError(shield, 'OwnableUnauthorizedAccount')
                    .withArgs(alice.address);
            });
        });
        context('when set to true', function () {
            it('paused variable is true', async function () {
                const { shield } = await loadFixture(deployWhitelistFixture);

                // 実行
                await shield.setPaused(true);

                // 検証
                // paused変数がtrueになることを確認します。
                expect(await shield.paused()).to.equal(true);
            });
        });
        context('when set to false', function () {
            it('paused variable is false', async function () {
                const { shield } = await loadFixture(deployWhitelistFixture);
                // booleanの初期値はfalseなので、一度trueにします。
                await shield.setPaused(true);

                await shield.setPaused(false);

                // paused変数がfalseになることを確認します。
                expect(await shield.paused()).to.equal(false);
            });
        });
    });

    describe('mint', function () {
        context('when paused is true', function () {
            it('reverts', async function () {
                const { shield, alice, price } = await loadFixture(
                    deployWhitelistFixture,
                );
                await shield.setPaused(true);

                // paused変数がtrueの場合、mint関数を実行するとエラーとなることを確認します。
                await expect(
                    shield.connect(alice).mint({ value: price }),
                ).to.be.revertedWith('Contract currently paused');
            });
        });
        context('when user is not in whitelist', function () {
            it('reverts', async function () {
                const { shield, bob, price } = await loadFixture(
                    deployWhitelistFixture,
                );

                // ホワイトリストに存在しないbobがmint関数を実行するとエラーとなることを確認します。
                await expect(
                    shield.connect(bob).mint({ value: price }),
                ).to.be.revertedWith('You are not whitelisted');
            });
        });
        context(
            'when the number of maxTokenIds has already been minted',
            function () {
                it('reverts', async function () {
                    const { shield, price, maxTokenIds } = await loadFixture(
                        deployWhitelistFixture,
                    );
                    // maxTokenIdsの数だけmint関数を実行します。
                    for (let id = 0; id < maxTokenIds; id++) {
                        await shield.mint({ value: price });
                    }

                    // maxTokenIdsの数を超えてmint関数を実行するとエラーとなることを確認します。
                    await expect(shield.mint({ value: price })).to.be.revertedWith(
                        'Exceeded maximum Shields supply',
                    );
                });
            },
        );
        context('when msg.value is less than price', function () {
            it('reverts', async function () {
                const { shield, alice } = await loadFixture(deployWhitelistFixture);

                // mint関数を実行する際にmsg.valueがpriceより少ない場合、エラーとなることを確認します。
                await expect(
                    shield.connect(alice).mint({ value: 0 }),
                ).to.be.revertedWith('Ether sent is not correct');
            });
        });
        context('when mint is successful', function () {
            it('Shield balance increases', async function () {
                const { shield, price } = await loadFixture(deployWhitelistFixture);
                // 現在のShieldコントラクトの残高を取得します。
                const shieldBalance = ethers.utils.formatEther(
                    await ethers.provider.getBalance(shield.address),
                );
                // mint関数実行後に期待されるShieldコントラクトの残高を計算します。
                const expectedShieldBalance =
                    parseFloat(shieldBalance) +
                    parseFloat(ethers.utils.formatEther(price));

                await shield.mint({ value: price });

                // mint関数実行後のShieldコントラクトの残高を取得します。
                const shieldBalanceAfterMint = ethers.utils.formatEther(
                    await ethers.provider.getBalance(shield.address),
                );

                // mint関数実行後のShieldコントラクトの残高が、期待する値と一致することを確認します。
                expect(parseFloat(shieldBalanceAfterMint)).to.equal(
                    expectedShieldBalance,
                );
            });
        });
    });

    describe('withdraw', function () {
        context('when user is not owner', function () {
            it('reverts', async function () {
                const { shield, alice } = await loadFixture(deployWhitelistFixture);

                // コントラクトのオーナーではないアカウントが、withdraw関数を実行しようとするとエラーとなることを確認します。
                await expect(shield.connect(alice).withdraw())
                    .to.be.revertedWithCustomError(shield, 'OwnableUnauthorizedAccount')
                    .withArgs(alice.address);
            });
        });
        context('when owner executes', function () {
            it("owner's balance increases", async function () {
                const { shield, price, owner, alice } = await loadFixture(
                    deployWhitelistFixture,
                );

                await shield.connect(alice).mint({ value: price });

                // 現在のownerの残高を取得します。
                const ownerBalanceBeforeWithdraw = await owner.getBalance();

                // トランザクションの実行にかかったガス代を計算します。
                const tx = await shield.withdraw();
                const receipt = await tx.wait();
                const txCost = receipt.gasUsed.mul(tx.gasPrice);

                // withdraw関数実行後に期待されるownerの残高を計算します。
                const expectedOwnerBalance = ownerBalanceBeforeWithdraw
                    .add(price)
                    .sub(txCost);

                // withdraw関数実行後のownerの残高を取得します。
                const ownerBalanceAfterWithdraw = await owner.getBalance();

                // withdraw関数実行後のownerの残高が、期待する値と一致することを確認します。
                expect(ownerBalanceAfterWithdraw).to.equal(expectedOwnerBalance);
            });
        });
    });
});